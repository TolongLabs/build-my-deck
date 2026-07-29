/**
 * `RunBudget` is passed to every broker call. It reserves conservatively before a call
 * starts and reconciles against provider-reported usage after — never the other way
 * round, or a burst of parallel calls could oversubscribe a shared finite pool.
 */
export interface RunBudgetLimits {
  /** Required, finite. A client may request a lower ceiling; it can never raise this one. */
  maxTotalTokens: number
  /** Epoch milliseconds. */
  deadlineAt: number
}

export interface RunBudgetReservation {
  readonly maxOutputTokens: number
  /** Idempotent: only the first call has an effect. */
  reconcile(usage: { inputTokens: number; outputTokens: number }): void
}

export type ReserveResult =
  | { ok: true; reservation: RunBudgetReservation }
  | { ok: false; reason: 'run_budget_exceeded' }

/** Conservative: assumes worst-case ~2 bytes per token so a call is never under-reserved. */
const CONSERVATIVE_BYTES_PER_TOKEN = 2

export function estimateTokensFromUtf8Bytes(byteLength: number): number {
  return Math.max(1, Math.ceil(byteLength / CONSERVATIVE_BYTES_PER_TOKEN))
}

export class RunBudget {
  readonly limits: RunBudgetLimits
  readonly signal: AbortSignal
  #committedTokens = 0
  #inFlightTokens = 0

  constructor(limits: RunBudgetLimits, signal: AbortSignal = new AbortController().signal) {
    if (!Number.isFinite(limits.maxTotalTokens) || limits.maxTotalTokens <= 0) {
      throw new Error('RunBudget requires a finite, positive maxTotalTokens')
    }
    if (!Number.isFinite(limits.deadlineAt)) {
      throw new Error('RunBudget requires a finite deadlineAt')
    }
    this.limits = limits
    this.signal = signal
  }

  get remainingTokens(): number {
    return Math.max(0, this.limits.maxTotalTokens - this.#committedTokens - this.#inFlightTokens)
  }

  get consumedTokens(): number {
    return this.#committedTokens
  }

  get exhausted(): boolean {
    return this.remainingTokens <= 0 || Date.now() >= this.limits.deadlineAt || this.signal.aborted
  }

  /**
   * Synchronous and race-free: two calls made back-to-back (no `await` between them) can
   * never both reserve more than `remainingTokens` allows, because the reservation is
   * committed to `#inFlightTokens` before this function returns.
   */
  reserveForCall(estimatedInputTokens: number, requestedMaxOutputTokens: number): ReserveResult {
    if (this.exhausted) return { ok: false, reason: 'run_budget_exceeded' }

    const remaining = this.remainingTokens
    const maxOutputTokens = Math.min(requestedMaxOutputTokens, Math.max(0, remaining - estimatedInputTokens))
    if (maxOutputTokens <= 0) return { ok: false, reason: 'run_budget_exceeded' }

    const reservedAmount = estimatedInputTokens + maxOutputTokens
    this.#inFlightTokens += reservedAmount
    let reconciled = false

    return {
      ok: true,
      reservation: {
        maxOutputTokens,
        reconcile: (usage) => {
          if (reconciled) return
          reconciled = true
          this.#inFlightTokens -= reservedAmount
          this.#committedTokens += usage.inputTokens + usage.outputTokens
        }
      }
    }
  }
}
