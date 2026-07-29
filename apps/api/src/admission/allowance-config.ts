import type { AllowanceCeilings } from './allowance'

const DEFAULT_MAX_USER_TOTAL_TOKENS = 200_000
const DEFAULT_MAX_USER_RUNS = 20

function parsePositiveInt(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined || value.length === 0) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

/** Per-user allowance ceilings, one flat pair applied to every user — not a per-user configurable value. */
export function loadAllowanceCeilings(env: Record<string, string | undefined> = process.env): AllowanceCeilings {
  return {
    maxTotalTokens: parsePositiveInt(env.MAX_USER_TOTAL_TOKENS, 'MAX_USER_TOTAL_TOKENS', DEFAULT_MAX_USER_TOTAL_TOKENS),
    maxRuns: parsePositiveInt(env.MAX_USER_RUNS, 'MAX_USER_RUNS', DEFAULT_MAX_USER_RUNS)
  }
}
