import type { ModelDescriptor, ProviderDescriptor, StructuredOutputTier } from './capabilities'

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StructuredOutputRequest {
  tier: StructuredOutputTier
  /** The portable-subset JSON Schema, already linted. */
  jsonSchema: Record<string, unknown>
  schemaName: string
}

export interface CompletionRequest {
  modelId: string
  messages: CompletionMessage[]
  maxOutputTokens: number
  structuredOutput?: StructuredOutputRequest
  temperature?: number
}

export interface CompletionResult {
  text: string
  usage: { inputTokens: number; outputTokens: number }
  finishReason: 'stop' | 'length' | 'tool_call'
}

export interface ImageGenerationRequest {
  prompt: string
  modelId: string
}

export interface ImageGenerationResult {
  assetBytes: Uint8Array
  mediaType: string
}

/**
 * The one contract every provider implements. `complete` normalizes provider-specific
 * failures into `ProviderError`s — a stage or the broker never inspects an HTTP status or
 * a raw provider payload.
 */
export interface ProviderAdapter {
  readonly descriptor: ProviderDescriptor
  listModels(): ModelDescriptor[]
  complete(request: CompletionRequest, signal: AbortSignal): Promise<CompletionResult>
  generateImage?(request: ImageGenerationRequest, signal: AbortSignal): Promise<ImageGenerationResult>
}
