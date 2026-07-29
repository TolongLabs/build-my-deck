import type { CompletionResult, ProviderAdapter } from '../adapter'
import type { ModelDescriptor } from '../capabilities'
import { type CredentialResolver, type EnvSource, envCredentialResolver } from '../credentials'
import { ProviderError, type ProviderErrorKind } from '../errors'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const GEMINI_MODELS: ModelDescriptor[] = [
  {
    // The rolling "latest" alias, not a dated snapshot: Gemini's dated model ids are
    // retired from new-project access on a schedule this adapter cannot predict.
    id: 'gemini-flash-latest',
    capabilities: {
      inputModalities: ['text', 'image'],
      contextWindowTokens: 1_000_000,
      maxOutputTokens: 8_192,
      structuredOutputTier: 'native_json_schema',
      imageGeneration: false,
      streaming: true
    }
  }
]

interface GenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
}

interface GoogleErrorBody {
  error?: { status?: string }
}

/**
 * Both a genuinely transient rate limit and a hard daily quota exhaustion surface as
 * HTTP 429 — but Gemini's own error body distinguishes them via `error.status`, and the
 * distinction is load-bearing for a shared-pool hosted service: `quota_exhausted` must
 * stop retrying and surface `shared_pool_exhausted`, while `rate_limit` is eligible for
 * the broker's normal backoff. Conflating them into one `rate_limit` bucket (as this
 * adapter previously did) would spin a shared-pool exhaustion through repair attempts
 * that can never succeed until the quota resets.
 */
async function classifyGeminiErrorResponse(response: Response): Promise<ProviderErrorKind> {
  if (response.status === 401 || response.status === 403) return 'auth'
  if (response.status === 429) {
    try {
      const body = (await response.json()) as GoogleErrorBody
      if (body.error?.status === 'RESOURCE_EXHAUSTED') return 'quota_exhausted'
    } catch {
      // Body wasn't parseable JSON — fall through to the conservative rate_limit default.
    }
    return 'rate_limit'
  }
  if (response.status >= 500) return 'transient'
  return 'transient'
}

/**
 * Gemini's `responseSchema` accepts only a restricted OpenAPI-3.0-like subset of JSON
 * Schema — notably it rejects `additionalProperties` and `$schema` outright (HTTP 400).
 * This keeps that translation local to this adapter rather than weakening the portable
 * schema linter shared by every provider.
 */
function toGeminiResponseSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiResponseSchema)
  if (node !== null && typeof node === 'object') {
    const { additionalProperties: _additionalProperties, $schema: _$schema, ...rest } = node as Record<string, unknown>
    return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, toGeminiResponseSchema(value)]))
  }
  return node
}

/**
 * Native Gemini — a genuinely different request/response/structured-output shape from the
 * OpenAI-compatible path, which is what makes provider heterogeneity a tested property.
 */
export function createGeminiAdapter(options: { resolveApiKey: CredentialResolver; baseUrl?: string }): ProviderAdapter {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL

  return {
    descriptor: { id: 'gemini', name: 'Google Gemini (native)' },
    listModels: () => GEMINI_MODELS,
    async complete(request, signal): Promise<CompletionResult> {
      const model = GEMINI_MODELS.find((candidate) => candidate.id === request.modelId)
      if (!model)
        throw new ProviderError('unsupported_capability', `Model "${request.modelId}" is not offered by gemini`)

      const apiKey = await options.resolveApiKey()
      const systemMessages = request.messages.filter((message) => message.role === 'system')
      const conversation = request.messages.filter((message) => message.role !== 'system')

      const generationConfig: Record<string, unknown> = { maxOutputTokens: request.maxOutputTokens }
      if (request.structuredOutput) {
        generationConfig.responseMimeType = 'application/json'
        if (request.structuredOutput.tier === 'native_json_schema') {
          generationConfig.responseSchema = toGeminiResponseSchema(request.structuredOutput.jsonSchema)
        }
      }

      const body = {
        contents: conversation.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        })),
        ...(systemMessages.length > 0
          ? { systemInstruction: { parts: systemMessages.map((message) => ({ text: message.content })) } }
          : {}),
        generationConfig
      }

      let response: Response
      try {
        response = await fetch(`${baseUrl.replace(/\/$/, '')}/models/${request.modelId}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal
        })
      } catch (error) {
        if (signal.aborted) throw new ProviderError('aborted', 'Request aborted', { cause: error })
        throw new ProviderError('transient', 'Network error contacting provider', { cause: error })
      }

      if (!response.ok) {
        const kind = await classifyGeminiErrorResponse(response)
        throw new ProviderError(kind, `Provider responded with status ${response.status}`)
      }

      const payload = (await response.json()) as GenerateContentResponse
      const candidate = payload.candidates?.[0]
      if (!candidate) throw new ProviderError('invalid_structured_output', 'Provider returned no candidates')
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new ProviderError('refusal', 'Provider refused the request')
      }

      const text = candidate.content?.parts?.map((part) => part.text ?? '').join('') ?? ''

      const inputTokens = payload.usageMetadata?.promptTokenCount ?? 0
      // `candidatesTokenCount` alone excludes Gemini's billed hidden "thinking" tokens;
      // `totalTokenCount - promptTokenCount` reconciles the run budget against what is
      // actually charged.
      const outputTokens =
        payload.usageMetadata?.totalTokenCount !== undefined
          ? Math.max(0, payload.usageMetadata.totalTokenCount - inputTokens)
          : (payload.usageMetadata?.candidatesTokenCount ?? 0)

      return {
        text,
        usage: { inputTokens, outputTokens },
        finishReason: candidate.finishReason === 'MAX_TOKENS' ? 'length' : 'stop'
      }
    }
  }
}

/**
 * The one place `GEMINI_API_KEY` is named — inside the provider-adapter layer, per
 * `AGENTS.md`'s do-not on naming a vendor outside it. Callers (the hosted runtime, the
 * pipeline) never see this name; they call this factory instead.
 */
export function createGeminiAdapterFromEnv(env: EnvSource = process.env): ProviderAdapter {
  return createGeminiAdapter({ resolveApiKey: envCredentialResolver(env, 'GEMINI_API_KEY') })
}
