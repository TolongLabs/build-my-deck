/**
 * The one place *generic* operator secrets are read by name, at runtime, from `process.env`
 * — session/CSRF/IP-hash material that has no vendor. Values are never cached beyond the
 * returned closure's scope and never logged.
 *
 * Provider credentials (`DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `GEMINI_API_KEY`) are
 * deliberately **not** named here: `AGENTS.md`'s do-not forbids naming a vendor outside the
 * provider-adapter layer, and `apps/api` is the hosted runtime, not that layer. Those names
 * live in `packages/providers`'s `createQwenAdapterFromEnv`/`createGeminiAdapterFromEnv` —
 * adding a future vendor only ever touches that package, never this one.
 */
export type EnvSecrets = Record<string, string | undefined>

/** Returns a resolver that reads `name` from `env` at call time; throws if it is unset. */
export function requireSecret(env: EnvSecrets, name: string): () => Promise<string> {
  return async () => {
    const value = env[name]
    if (!value) throw new Error(`Missing required secret: ${name}`)
    return value
  }
}

/** Test/diagnostic helper: asserts none of `secrets` appears anywhere in `haystack`. */
export function assertNoSecretLeak(haystack: string, secrets: readonly (string | undefined)[]): void {
  for (const secret of secrets) {
    if (secret && secret.length > 0 && haystack.includes(secret)) {
      throw new Error('A secret value leaked into output')
    }
  }
}
