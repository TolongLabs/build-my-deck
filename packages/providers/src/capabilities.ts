/**
 * `ModelCapabilities` live on model descriptors, not provider descriptors — one provider
 * hosts models with different context windows, structured-output tiers and modalities.
 */
export type StructuredOutputTier = 'native_json_schema' | 'forced_tool_call' | 'json_mode' | 'prompt_only'

export type InputModality = 'text' | 'image'

export interface ModelCapabilities {
  inputModalities: InputModality[]
  contextWindowTokens: number
  maxOutputTokens: number
  structuredOutputTier: StructuredOutputTier
  imageGeneration: boolean
  streaming: boolean
}

export interface ModelDescriptor {
  id: string
  capabilities: ModelCapabilities
}

export interface ProviderDescriptor {
  id: string
  name: string
}
