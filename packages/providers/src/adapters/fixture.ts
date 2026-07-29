import type { CompletionRequest, CompletionResult, ProviderAdapter } from '../adapter'
import type { ModelDescriptor } from '../capabilities'
import { ProviderError } from '../errors'

/** One model per structured-output tier, so a single test suite can drive all four. */
export const FIXTURE_MODELS: ModelDescriptor[] = [
  {
    id: 'fixture-native-json-schema',
    capabilities: {
      inputModalities: ['text'],
      contextWindowTokens: 32_000,
      maxOutputTokens: 2_000,
      structuredOutputTier: 'native_json_schema',
      imageGeneration: false,
      streaming: false
    }
  },
  {
    id: 'fixture-forced-tool-call',
    capabilities: {
      inputModalities: ['text'],
      contextWindowTokens: 32_000,
      maxOutputTokens: 2_000,
      structuredOutputTier: 'forced_tool_call',
      imageGeneration: false,
      streaming: false
    }
  },
  {
    id: 'fixture-json-mode',
    capabilities: {
      inputModalities: ['text'],
      contextWindowTokens: 32_000,
      maxOutputTokens: 2_000,
      structuredOutputTier: 'json_mode',
      imageGeneration: false,
      streaming: false
    }
  },
  {
    id: 'fixture-prompt-only',
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

export type FixtureResponder = (request: CompletionRequest) => unknown

/** Deterministic — the same request always produces the same schema-valid response. */
export function createFixtureAdapter(respond: FixtureResponder): ProviderAdapter {
  return {
    descriptor: { id: 'fixture', name: 'Deterministic Fixture' },
    listModels: () => FIXTURE_MODELS,
    async complete(request, signal): Promise<CompletionResult> {
      if (signal.aborted) throw new ProviderError('aborted', 'Aborted before the fixture produced a response')

      const text = JSON.stringify(respond(request))
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
