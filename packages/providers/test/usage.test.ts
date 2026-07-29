import { describe, expect, test } from 'bun:test'
import { estimateCallCostUsd } from '../src/usage'

describe('estimateCallCostUsd', () => {
  test('is undefined when no operator-supplied pricing metadata exists — no hardcoded cost target', () => {
    expect(estimateCallCostUsd({ inputTokens: 1_000, outputTokens: 500 })).toBeUndefined()
  })

  test('computes cost from operator-supplied per-million pricing', () => {
    const cost = estimateCallCostUsd(
      { inputTokens: 1_000_000, outputTokens: 500_000 },
      { inputPerMillionUsd: 2, outputPerMillionUsd: 8, asOf: '2026-01-01' }
    )
    expect(cost).toBeCloseTo(2 + 4, 5)
  })
})
