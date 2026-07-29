/** Normalized call usage — one shape emitted identically by fixture, noisy and both live adapters. */
export interface CallUsage {
  stage: string
  attempt: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  wallMs: number
  modelId: string
  estimatedCostUsd?: number
}

/** Only ever supplied by the operator, never invented — no cost target is hardcoded in pipeline logic. */
export interface PricingMetadata {
  inputPerMillionUsd: number
  outputPerMillionUsd: number
  asOf: string
}

export function estimateCallCostUsd(
  usage: Pick<CallUsage, 'inputTokens' | 'outputTokens'>,
  pricing?: PricingMetadata
): number | undefined {
  if (!pricing) return undefined
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPerMillionUsd
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMillionUsd
  return inputCost + outputCost
}
