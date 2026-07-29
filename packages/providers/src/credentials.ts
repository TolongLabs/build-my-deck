/**
 * The generic provider-layer credential injection point (Q15). Slice 1 resolves only
 * operator environment/deployment secrets, but adapters never know where a resolved value
 * came from — a future local bridge or ephemeral hosted BYOK plugs into this same seam
 * without changing an adapter's type.
 */
export type CredentialResolver = () => Promise<string>

/** Test/fixture helper only — production resolvers are built by the vendor-specific `*FromEnv` adapter constructors below. */
export function staticCredentialResolver(secret: string): CredentialResolver {
  return async () => secret
}

export type EnvSource = Record<string, string | undefined>

/**
 * Reads `name` from `env` at call time and never before — generic, no vendor knowledge.
 * Vendor-specific adapter constructors (`createQwenAdapterFromEnv`, `createGeminiAdapterFromEnv`, ...)
 * are the only place a concrete env var name is paired with a concrete vendor.
 */
export function envCredentialResolver(env: EnvSource, name: string): CredentialResolver {
  return async () => {
    const value = env[name]
    if (!value) throw new Error(`Missing required credential: ${name}`)
    return value
  }
}

/** Same guard as `envCredentialResolver`, for plain config values (e.g. a base URL) rather than secrets. */
export function requireEnvValue(env: EnvSource, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`Missing required config: ${name}`)
  return value
}
