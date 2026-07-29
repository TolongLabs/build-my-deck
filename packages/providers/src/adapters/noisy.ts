import type { CompletionRequest, CompletionResult, ProviderAdapter } from '../adapter'
import type { ModelDescriptor } from '../capabilities'
import { ProviderError } from '../errors'

export const NOISY_MODELS: ModelDescriptor[] = [
  {
    id: 'noisy-prompt-only',
    capabilities: {
      inputModalities: ['text'],
      contextWindowTokens: 32_000,
      maxOutputTokens: 2_000,
      structuredOutputTier: 'prompt_only',
      imageGeneration: false,
      streaming: false
    }
  }
]

export type NoisyResponder = (request: CompletionRequest) => Record<string, unknown>

/**
 * Adversarial: the first attempt for a given call adds an unexpected field (fails a strict
 * schema) so the broker's one-correction round trip is genuinely exercised; every retry
 * afterward is clean. Deterministic per-call-count, not random, so tests are reproducible.
 */
export function createNoisyAdapter(respond: NoisyResponder): ProviderAdapter {
  const attemptsByCallSignature = new Map<string, number>()

  return {
    descriptor: { id: 'noisy', name: 'Adversarial Noisy' },
    listModels: () => NOISY_MODELS,
    async complete(request, signal): Promise<CompletionResult> {
      if (signal.aborted) throw new ProviderError('aborted', 'Aborted before the noisy adapter produced a response')

      const signature = request.messages[0]?.content ?? ''
      const attempt = (attemptsByCallSignature.get(signature) ?? 0) + 1
      attemptsByCallSignature.set(signature, attempt)

      const clean = respond(request)
      const text = JSON.stringify(attempt === 1 ? { ...clean, unexpectedField: 'noise' } : clean)

      return {
        text,
        usage: {
          inputTokens: request.messages.reduce((sum, message) => sum + message.content.length, 0),
          outputTokens: text.length
        },
        finishReason: 'stop'
      }
    }
  }
}
