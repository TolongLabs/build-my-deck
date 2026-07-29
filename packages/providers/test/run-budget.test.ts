import { describe, expect, test } from 'bun:test'
import { RunBudget, estimateTokensFromUtf8Bytes } from '../src/run-budget'

describe('RunBudget', () => {
  test('requires a finite, positive token ceiling and a finite deadline', () => {
    expect(() => new RunBudget({ maxTotalTokens: 0, deadlineAt: Date.now() + 1_000 })).toThrow()
    expect(() => new RunBudget({ maxTotalTokens: Number.POSITIVE_INFINITY, deadlineAt: Date.now() + 1_000 })).toThrow()
    expect(() => new RunBudget({ maxTotalTokens: 100, deadlineAt: Number.NaN })).toThrow()
  })

  test('reserves conservatively and clamps requested output to the remaining allowance', () => {
    const budget = new RunBudget({ maxTotalTokens: 100, deadlineAt: Date.now() + 10_000 })

    const reserved = budget.reserveForCall(20, 1_000)
    expect(reserved.ok).toBe(true)
    if (reserved.ok) expect(reserved.reservation.maxOutputTokens).toBe(80)
  })

  test('a client-requested lower limit is honoured, but a higher request never raises the ceiling', () => {
    const budget = new RunBudget({ maxTotalTokens: 100, deadlineAt: Date.now() + 10_000 })

    const reserved = budget.reserveForCall(10, 30)
    expect(reserved.ok).toBe(true)
    if (reserved.ok) expect(reserved.reservation.maxOutputTokens).toBe(30)

    expect(budget.remainingTokens).toBe(60)
  })

  test('parallel reservations cannot oversubscribe the same run', () => {
    const budget = new RunBudget({ maxTotalTokens: 100, deadlineAt: Date.now() + 10_000 })

    // Three calls of 30 tokens each (10 input + 20 output) exactly fill the ceiling; a
    // fourth, made before any of the first three reconcile, must be refused.
    const first = budget.reserveForCall(10, 20)
    const second = budget.reserveForCall(10, 20)
    const third = budget.reserveForCall(10, 20)
    const fourth = budget.reserveForCall(10, 20)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(third.ok).toBe(true)
    expect(fourth.ok).toBe(false)
    if (fourth.ok === false) expect(fourth.reason).toBe('run_budget_exceeded')
  })

  test('the next call never starts once the budget is exhausted', () => {
    const budget = new RunBudget({ maxTotalTokens: 10, deadlineAt: Date.now() + 10_000 })
    const reserved = budget.reserveForCall(5, 5)
    expect(reserved.ok).toBe(true)
    if (reserved.ok) reserved.reservation.reconcile({ inputTokens: 5, outputTokens: 5 })

    expect(budget.exhausted).toBe(true)
    expect(budget.reserveForCall(1, 1).ok).toBe(false)
  })

  test('reconciling actual usage frees unused reserved slack for later calls in the same run', () => {
    const budget = new RunBudget({ maxTotalTokens: 100, deadlineAt: Date.now() + 10_000 })
    const reserved = budget.reserveForCall(10, 50)
    expect(reserved.ok).toBe(true)
    if (reserved.ok) reserved.reservation.reconcile({ inputTokens: 10, outputTokens: 5 })

    expect(budget.consumedTokens).toBe(15)
    expect(budget.remainingTokens).toBe(85)
  })

  test('reconcile is idempotent', () => {
    const budget = new RunBudget({ maxTotalTokens: 100, deadlineAt: Date.now() + 10_000 })
    const reserved = budget.reserveForCall(10, 50)
    expect(reserved.ok).toBe(true)
    if (reserved.ok) {
      reserved.reservation.reconcile({ inputTokens: 10, outputTokens: 5 })
      reserved.reservation.reconcile({ inputTokens: 999, outputTokens: 999 })
    }

    expect(budget.consumedTokens).toBe(15)
  })

  test('is exhausted once the deadline passes, independent of remaining tokens', () => {
    const budget = new RunBudget({ maxTotalTokens: 1_000, deadlineAt: Date.now() - 1 })
    expect(budget.exhausted).toBe(true)
    expect(budget.reserveForCall(1, 1).ok).toBe(false)
  })

  test('is exhausted once the signal aborts', () => {
    const controller = new AbortController()
    const budget = new RunBudget({ maxTotalTokens: 1_000, deadlineAt: Date.now() + 10_000 }, controller.signal)
    controller.abort()
    expect(budget.exhausted).toBe(true)
    expect(budget.reserveForCall(1, 1).ok).toBe(false)
  })

  test('estimateTokensFromUtf8Bytes is conservative and never returns zero for non-empty input', () => {
    expect(estimateTokensFromUtf8Bytes(1)).toBeGreaterThanOrEqual(1)
    expect(estimateTokensFromUtf8Bytes(100)).toBeGreaterThanOrEqual(50)
  })
})
