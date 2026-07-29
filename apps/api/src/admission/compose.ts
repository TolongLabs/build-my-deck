import type { Database } from 'bun:sqlite'
import type { GenerationSemaphore } from '../concurrency/generation-semaphore'
import type { RunBudgetDefaults } from '../config'
import { HttpError } from '../http-errors'
import type { ClientRequestedRunLimits, ResolvedRunLimits } from '../run-budget/limits'
import { resolveRunLimits } from '../run-budget/limits'
import type { SessionConfig } from '../sessions/store'
import { verifySession } from '../sessions/store'
import type { AllowanceCeilings } from './allowance'
import { reserveAllowance } from './allowance'
import type { IpBackstop } from './ip-backstop'

export interface AdmissionDeps {
  db: Database
  sessionConfig: SessionConfig
  ipBackstop: IpBackstop
  allowanceCeilings: AllowanceCeilings
  generationSemaphore: GenerationSemaphore
  runBudgetDefaults: RunBudgetDefaults
}

export interface AdmissionRequest {
  sessionToken: string | undefined
  clientIp: string
  requestedLimits?: ClientRequestedRunLimits
}

export interface AdmissionContext {
  userId: string
  runLimits: ResolvedRunLimits
  /** Must be called exactly once when the run ends — success, abort, or error. Idempotent. */
  settle(usage?: { totalTokens: number }): void
}

export type AdmissionResult = { ok: true; context: AdmissionContext } | { ok: false; error: HttpError }

/**
 * Composes every admission layer in the mandated order: authenticated user → coarse IP
 * backstop → atomic per-user allowance → global generation semaphore. Task 6A's per-run
 * circuit breaker is the layer after this one — it is constructed from `runLimits` by the
 * caller once the pipeline actually starts, which this function never reaches unless every
 * layer above it already allowed the request. A denial at any layer releases whatever this
 * same attempt already reserved, so nothing here is ever leaked on abort.
 */
export function admitGenerationRequest(deps: AdmissionDeps, request: AdmissionRequest): AdmissionResult {
  const session = request.sessionToken ? verifySession(deps.db, request.sessionToken, deps.sessionConfig) : null
  if (!session) {
    return { ok: false, error: new HttpError(401, 'unauthorized', 'Sign in required') }
  }

  if (!deps.ipBackstop.attempt(request.clientIp)) {
    return {
      ok: false,
      error: new HttpError(503, 'capacity_busy', 'Too many attempts from this network', { retryAfterMs: 60_000 })
    }
  }

  const runLimits = resolveRunLimits(deps.runBudgetDefaults, request.requestedLimits)

  const reserved = reserveAllowance(deps.db, session.userId, runLimits.maxTotalTokens, deps.allowanceCeilings)
  if (!reserved.ok) {
    return {
      ok: false,
      error: new HttpError(429, 'shared_pool_exhausted', 'Your allowance for the shared pool is exhausted')
    }
  }

  const acquired = deps.generationSemaphore.tryAcquire()
  if (!acquired.ok) {
    reserved.reservation.release()
    return { ok: false, error: acquired.error }
  }

  let settled = false

  return {
    ok: true,
    context: {
      userId: session.userId,
      runLimits,
      settle(usage) {
        if (settled) return
        settled = true
        if (usage) reserved.reservation.reconcile(usage.totalTokens)
        else reserved.reservation.release()
        acquired.release()
      }
    }
  }
}
