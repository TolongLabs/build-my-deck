import type { RunBudgetDefaults } from '../config'

export interface ClientRequestedRunLimits {
  maxTotalTokens?: number
  maxWallMs?: number
}

export interface ResolvedRunLimits {
  maxTotalTokens: number
  wallDeadlineAt: number
}

function clampToServerCeiling(clientValue: number | undefined, serverCeiling: number): number {
  if (clientValue === undefined) return serverCeiling
  if (!Number.isFinite(clientValue) || clientValue <= 0) return serverCeiling
  // A client may request a lower limit than the server cap; it can never raise it.
  return Math.min(clientValue, serverCeiling)
}

/**
 * The API-level policy layer: derives the finite limits handed to a `RunBudget` for one
 * generation run, from the operator-configured server ceiling and an optional client
 * request — a client can only ever narrow it, never widen it.
 */
export function resolveRunLimits(
  defaults: RunBudgetDefaults,
  requested: ClientRequestedRunLimits = {}
): ResolvedRunLimits {
  const maxTotalTokens = clampToServerCeiling(requested.maxTotalTokens, defaults.maxTotalTokens)
  const maxWallMs = clampToServerCeiling(requested.maxWallMs, defaults.maxWallMs)

  return {
    maxTotalTokens,
    wallDeadlineAt: Date.now() + maxWallMs
  }
}
