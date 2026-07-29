import type { CompletionResult, ProviderAdapter } from '../adapter'
import type { ModelDescriptor } from '../capabilities'
import { type CredentialResolver, type EnvSource, envCredentialResolver, requireEnvValue } from '../credentials'
import { ProviderError, type ProviderErrorKind } from '../errors'

export interface OpenAiCompatibleConfig {
  providerId: string
  providerName: string
  /** Parameterized so Qwen/DashScope, and optionally Ollama/LM Studio, share this one adapter. */
  baseUrl: string
  resolveApiKey: CredentialResolver
  models: ModelDescriptor[]
}

interface OpenAiCompatibleErrorBody {
  error?: { message?: string; type?: string; code?: string | number }
}

/**
 * A genuinely transient rate limit and a hard quota/billing exhaustion both surface as
 * HTTP 429 — and for **this** adapter that distinction is the one that funds the product:
 * DashScope/Qwen is the provider the shared $300 pool actually spends against, so a
 * drained pool misclassified as `rate_limit` would stay eligible for retry/backoff and
 * spend into an empty wallet instead of normalizing to `shared_pool_exhausted` and
 * stopping (see the identical, already-fixed defect in `adapters/gemini.ts`).
 *
 * Evidence used, in order of confidence:
 *   1. OpenAI's well-established error contract — `error.type`/`error.code` of
 *      `"insufficient_quota"` (billing/quota exhausted) versus `"rate_limit_exceeded"`
 *      (transient RPM/TPM throttling). DashScope's endpoint is documented as
 *      OpenAI-compatible specifically so existing OpenAI error handling keeps working,
 *      so trusting this shape here is evidence-based, not assumed.
 *   2. A message/code substring match on billing-exhaustion vocabulary ("quota",
 *      "arrearage", "insufficient", "balance") — weaker, heuristic evidence covering
 *      DashScope's own (undocumented-here) error codes, which have **not** been observed
 *      against a real 429 in this codebase — none has occurred, and live pool quota was
 *      deliberately not spent manufacturing one to check.
 *   3. A parseable `Retry-After` header — generic HTTP semantics (RFC 7231), not
 *      vendor-specific: its presence is the server itself stating this is transient.
 *   4. Otherwise: **default to `quota_exhausted`**, not `rate_limit`. This is the
 *      documented, deliberate choice for a shared finite pool — an unrecognized 429 that
 *      turns out to be transient costs a false "pool exhausted" message; the same 429
 *      misread as transient costs unbounded spend into a drained pool. If a real DashScope
 *      429 body is later captured showing a different shape, revise this against that
 *      evidence — do not revert to a single `rate_limit` bucket.
 */
async function classifyOpenAiCompatibleErrorResponse(response: Response): Promise<ProviderErrorKind> {
  if (response.status === 401 || response.status === 403) return 'auth'
  if (response.status === 429) {
    let body: OpenAiCompatibleErrorBody | undefined
    try {
      body = (await response.json()) as OpenAiCompatibleErrorBody
    } catch {
      body = undefined
    }

    const type = body?.error?.type
    const code = body?.error?.code !== undefined ? String(body.error.code) : undefined
    const message = body?.error?.message?.toLowerCase() ?? ''

    if (type === 'insufficient_quota' || code === 'insufficient_quota') return 'quota_exhausted'
    if (type === 'rate_limit_exceeded' || code === 'rate_limit_exceeded') return 'rate_limit'

    const quotaVocabulary = /quota|arrearage|insufficient|balance/i
    if (quotaVocabulary.test(message) || (code !== undefined && quotaVocabulary.test(code))) {
      return 'quota_exhausted'
    }

    const retryAfterSeconds = Number(response.headers.get('retry-after'))
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) return 'rate_limit'

    return 'quota_exhausted'
  }
  if (response.status >= 500) return 'transient'
  return 'transient'
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: Array<{ function: { arguments: string } }>
    }
    finish_reason?: string
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/** An OpenAI-compatible `/chat/completions` client — the production Qwen/DashScope path. */
export function createOpenAiCompatibleAdapter(config: OpenAiCompatibleConfig): ProviderAdapter {
  return {
    descriptor: { id: config.providerId, name: config.providerName },
    listModels: () => config.models,
    async complete(request, signal): Promise<CompletionResult> {
      const model = config.models.find((candidate) => candidate.id === request.modelId)
      if (!model) {
        throw new ProviderError(
          'unsupported_capability',
          `Model "${request.modelId}" is not offered by ${config.providerId}`
        )
      }

      const apiKey = await config.resolveApiKey()
      const body: Record<string, unknown> = {
        model: request.modelId,
        messages: request.messages,
        max_tokens: request.maxOutputTokens
      }
      if (request.temperature !== undefined) body.temperature = request.temperature

      if (request.structuredOutput) {
        const { tier, jsonSchema, schemaName } = request.structuredOutput
        if (tier === 'native_json_schema') {
          body.response_format = {
            type: 'json_schema',
            json_schema: { name: schemaName, schema: jsonSchema, strict: true }
          }
        } else if (tier === 'forced_tool_call') {
          body.tools = [{ type: 'function', function: { name: schemaName, parameters: jsonSchema } }]
          body.tool_choice = { type: 'function', function: { name: schemaName } }
        } else if (tier === 'json_mode') {
          body.response_format = { type: 'json_object' }
        }
      }

      let response: Response
      try {
        response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal
        })
      } catch (error) {
        if (signal.aborted) throw new ProviderError('aborted', 'Request aborted', { cause: error })
        throw new ProviderError('transient', 'Network error contacting provider', { cause: error })
      }

      if (!response.ok) {
        const kind = await classifyOpenAiCompatibleErrorResponse(response)
        throw new ProviderError(kind, `Provider responded with status ${response.status}`)
      }

      const payload = (await response.json()) as ChatCompletionResponse
      const choice = payload.choices?.[0]
      if (!choice?.message) throw new ProviderError('invalid_structured_output', 'Provider returned no choices')
      if (choice.finish_reason === 'content_filter') throw new ProviderError('refusal', 'Provider refused the request')

      const text = choice.message.tool_calls?.[0]?.function.arguments ?? choice.message.content ?? ''

      return {
        text,
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0
        },
        finishReason: choice.finish_reason === 'length' ? 'length' : choice.message.tool_calls ? 'tool_call' : 'stop'
      }
    }
  }
}

/** The production path: real Qwen on DashScope's Intl-Singapore OpenAI-compatible endpoint. */
export function createQwenAdapter(options: { baseUrl: string; resolveApiKey: CredentialResolver }): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    providerId: 'qwen',
    providerName: 'Qwen (DashScope, OpenAI-compatible)',
    baseUrl: options.baseUrl,
    resolveApiKey: options.resolveApiKey,
    models: [
      {
        id: 'qwen-plus',
        capabilities: {
          inputModalities: ['text'],
          contextWindowTokens: 131_072,
          maxOutputTokens: 8_192,
          structuredOutputTier: 'json_mode',
          imageGeneration: false,
          streaming: true
        }
      }
    ]
  })
}

/**
 * The one place `DASHSCOPE_API_KEY`/`QWEN_BASE_URL` are named — inside the provider-adapter
 * layer, per `AGENTS.md`'s do-not on naming a vendor outside it. Callers (the hosted
 * runtime, the pipeline) never see these names; they call this factory instead.
 */
export function createQwenAdapterFromEnv(env: EnvSource = process.env): ProviderAdapter {
  return createQwenAdapter({
    baseUrl: requireEnvValue(env, 'QWEN_BASE_URL'),
    resolveApiKey: envCredentialResolver(env, 'DASHSCOPE_API_KEY')
  })
}
