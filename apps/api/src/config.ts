export interface RunBudgetDefaults {
  maxTotalTokens: number
  maxWallMs: number
}

export interface ApiConfig {
  port: number
  dataDir: string
  publicOrigin: string
  maxConcurrentRuns: number
  maxInputBytes: number
  runBudgetDefaults: RunBudgetDefaults
}

export interface LoadConfigOptions {
  production?: boolean
}

const DEFAULT_PORT = 3000
const DEFAULT_DATA_DIR = './data'
const DEFAULT_MAX_CONCURRENT_RUNS = 4
const DEFAULT_MAX_INPUT_BYTES = 2_000_000
const DEFAULT_MAX_RUN_TOTAL_TOKENS = 50_000
const DEFAULT_MAX_RUN_WALL_MS = 120_000

function parsePositiveInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value.length === 0) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function parsePublicOrigin(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined

  const url = new URL(value)
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_ORIGIN must be an http(s) origin without a path, query, or hash')
  }
  return url.origin
}

/**
 * Every value here is either explicit or a safe finite default — never `Infinity` — but
 * production additionally *requires* the operator to have set the run-budget/input values and
 * public origin explicitly: a missing spend ceiling or trust boundary must fail startup.
 */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
  options: LoadConfigOptions = {}
): ApiConfig {
  const production = options.production ?? env.NODE_ENV === 'production'

  const port = parsePositiveInt(env.PORT, 'PORT') ?? DEFAULT_PORT
  const maxTotalTokens = parsePositiveInt(env.MAX_RUN_TOTAL_TOKENS, 'MAX_RUN_TOTAL_TOKENS')
  const maxWallMs = parsePositiveInt(env.MAX_RUN_WALL_MS, 'MAX_RUN_WALL_MS')
  const maxInputBytes = parsePositiveInt(env.MAX_INPUT_BYTES, 'MAX_INPUT_BYTES')
  const publicOrigin = parsePublicOrigin(env.PUBLIC_ORIGIN)

  if (production) {
    const missing = [
      maxTotalTokens === undefined ? 'MAX_RUN_TOTAL_TOKENS' : undefined,
      maxWallMs === undefined ? 'MAX_RUN_WALL_MS' : undefined,
      maxInputBytes === undefined ? 'MAX_INPUT_BYTES' : undefined,
      publicOrigin === undefined ? 'PUBLIC_ORIGIN' : undefined
    ].filter((name): name is string => name !== undefined)

    if (missing.length > 0) {
      throw new Error(`Production requires finite operator values for: ${missing.join(', ')}`)
    }
  }

  return {
    port,
    dataDir: env.DATA_DIR && env.DATA_DIR.length > 0 ? env.DATA_DIR : DEFAULT_DATA_DIR,
    publicOrigin: publicOrigin ?? `http://localhost:${port}`,
    maxConcurrentRuns: parsePositiveInt(env.MAX_CONCURRENT_RUNS, 'MAX_CONCURRENT_RUNS') ?? DEFAULT_MAX_CONCURRENT_RUNS,
    maxInputBytes: maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES,
    runBudgetDefaults: {
      maxTotalTokens: maxTotalTokens ?? DEFAULT_MAX_RUN_TOTAL_TOKENS,
      maxWallMs: maxWallMs ?? DEFAULT_MAX_RUN_WALL_MS
    }
  }
}
