import { describe, expect, test } from 'bun:test'
import { resolveRunLimits } from '../src/run-budget/limits'

const DEFAULTS = { maxTotalTokens: 10_000, maxWallMs: 60_000 }

describe('resolveRunLimits', () => {
  test('with no client request, uses the server ceiling exactly', () => {
    const limits = resolveRunLimits(DEFAULTS)
    expect(limits.maxTotalTokens).toBe(10_000)
    expect(limits.wallDeadlineAt - Date.now()).toBeGreaterThan(59_000)
  })

  test('a client-requested lower ceiling is honoured', () => {
    const limits = resolveRunLimits(DEFAULTS, { maxTotalTokens: 500, maxWallMs: 5_000 })
    expect(limits.maxTotalTokens).toBe(500)
    expect(limits.wallDeadlineAt - Date.now()).toBeLessThan(6_000)
  })

  test('a client-requested higher ceiling never raises the server cap', () => {
    const limits = resolveRunLimits(DEFAULTS, { maxTotalTokens: 999_999, maxWallMs: 999_999 })
    expect(limits.maxTotalTokens).toBe(10_000)
    expect(limits.wallDeadlineAt - Date.now()).toBeLessThanOrEqual(60_000)
  })

  test('an invalid client request (zero, negative, non-finite) falls back to the server ceiling', () => {
    expect(resolveRunLimits(DEFAULTS, { maxTotalTokens: 0 }).maxTotalTokens).toBe(10_000)
    expect(resolveRunLimits(DEFAULTS, { maxTotalTokens: -5 }).maxTotalTokens).toBe(10_000)
    expect(resolveRunLimits(DEFAULTS, { maxTotalTokens: Number.NaN }).maxTotalTokens).toBe(10_000)
  })
})
