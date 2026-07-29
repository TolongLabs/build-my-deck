import type { z } from 'zod'
import type { CompletionMessage, ProviderAdapter } from './adapter'
import { ProviderError } from './errors'
import type { RunBudget } from './run-budget'
import { estimateTokensFromUtf8Bytes } from './run-budget'
import { toPortableJsonSchema } from './schema-lint'

export interface GenerateObjectRequest<T> {
  modelId: string
  schema: z.ZodType<T>
  schemaName: string
  system?: string
  messages: CompletionMessage[]
  stage: string
}

export interface GenerateObjectUsage {
  stage: string
  attempt: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  wallMs: number
  modelId: string
}

export type GenerateObjectResult<T> =
  | { ok: true; data: T; usage: GenerateObjectUsage }
  | { ok: false; error: ProviderError }
  | { ok: false; error: { kind: 'run_budget_exceeded' } }

/** At most one correction request, regardless of tier — the pipeline never endlessly paraphrases a prompt. */
const MAX_ATTEMPTS = 2

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? text
  return JSON.parse(candidate.trim())
}

/**
 * Dispatches through whichever of the four structured-output tiers the model declares.
 * The tier only changes how an adapter shapes its own request — every tier flows through
 * the identical validate/repair loop here, so "the same broker test succeeds across all
 * four tiers" is a property of this function, not of each adapter re-implementing it.
 */
export async function generateObject<T>(
  adapter: ProviderAdapter,
  request: GenerateObjectRequest<T>,
  budget: RunBudget,
  signal: AbortSignal
): Promise<GenerateObjectResult<T>> {
  const model = adapter.listModels().find((candidate) => candidate.id === request.modelId)
  if (!model) {
    return {
      ok: false,
      error: new ProviderError(
        'unsupported_capability',
        `Unknown model "${request.modelId}" for provider "${adapter.descriptor.id}"`
      )
    }
  }

  const jsonSchema = toPortableJsonSchema(request.schema as unknown as z.ZodType)
  const tier = model.capabilities.structuredOutputTier

  // Native JSON Schema and forced-tool-call tiers enforce the shape via the provider's own
  // mechanism; json_mode and prompt-only only guarantee (or don't even guarantee) valid JSON
  // syntax, so the schema must additionally be spelled out in the prompt itself.
  const needsPromptSchemaHint = tier === 'json_mode' || tier === 'prompt_only'
  const baseMessages: CompletionMessage[] = [
    ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
    ...(needsPromptSchemaHint
      ? [
          {
            role: 'system' as const,
            content: `Respond with only JSON matching this schema, no prose: ${JSON.stringify(jsonSchema)}`
          }
        ]
      : []),
    ...request.messages
  ]

  let messages = baseMessages
  let lastError: ProviderError | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (signal.aborted || budget.exhausted) return { ok: false, error: { kind: 'run_budget_exceeded' } }

    const estimatedInputTokens = estimateTokensFromUtf8Bytes(
      messages.reduce((sum, message) => sum + byteLength(message.content), 0)
    )
    const reserved = budget.reserveForCall(estimatedInputTokens, model.capabilities.maxOutputTokens)
    if (!reserved.ok) return { ok: false, error: { kind: 'run_budget_exceeded' } }

    const startedAt = Date.now()
    let result: Awaited<ReturnType<ProviderAdapter['complete']>>
    try {
      result = await adapter.complete(
        {
          modelId: request.modelId,
          messages,
          maxOutputTokens: reserved.reservation.maxOutputTokens,
          structuredOutput: { tier, jsonSchema, schemaName: request.schemaName }
        },
        signal
      )
    } catch (error) {
      reserved.reservation.reconcile({ inputTokens: estimatedInputTokens, outputTokens: 0 })
      if (!(error instanceof ProviderError)) throw error

      if (error.kind === 'refusal' && attempt < MAX_ATTEMPTS) {
        messages = [
          ...baseMessages,
          { role: 'user', content: 'Your previous response was refused. Provide a direct, policy-compliant answer.' }
        ]
        continue
      }
      return { ok: false, error }
    }

    reserved.reservation.reconcile(result.usage)
    const wallMs = Date.now() - startedAt

    let parsed: unknown
    try {
      parsed = extractJson(result.text)
    } catch {
      lastError = new ProviderError('invalid_structured_output', 'Response was not valid JSON')
      if (attempt < MAX_ATTEMPTS) {
        messages = [
          ...baseMessages,
          { role: 'assistant', content: result.text },
          { role: 'user', content: 'That response was not valid JSON. Reply again with only valid JSON, no prose.' }
        ]
        continue
      }
      return { ok: false, error: lastError }
    }

    const validated = request.schema.safeParse(parsed)
    if (!validated.success) {
      const issues = validated.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      lastError = new ProviderError('invalid_structured_output', `Response did not match schema: ${issues}`)
      if (attempt < MAX_ATTEMPTS) {
        messages = [
          ...baseMessages,
          { role: 'assistant', content: result.text },
          {
            role: 'user',
            content: `That did not match the schema (${issues}). Reply again with corrected, valid JSON only.`
          }
        ]
        continue
      }
      return { ok: false, error: lastError }
    }

    return {
      ok: true,
      data: validated.data,
      usage: {
        stage: request.stage,
        attempt,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.inputTokens + result.usage.outputTokens,
        wallMs,
        modelId: request.modelId
      }
    }
  }

  return {
    ok: false,
    error: lastError ?? new ProviderError('invalid_structured_output', 'Exhausted correction attempts')
  }
}
