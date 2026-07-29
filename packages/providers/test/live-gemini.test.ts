import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { createGeminiAdapterFromEnv } from '../src/adapters/gemini'
import { generateObject } from '../src/generate-object'
import { RunBudget } from '../src/run-budget'

/**
 * Opt-in *and* env-gated: a developer having `GEMINI_API_KEY` configured in `.env` must not
 * change which tests `bun test` runs by default — otherwise a real network call silently
 * rides along on every default run. Run this deliberately:
 *
 *   RUN_LIVE_PROVIDER_TESTS=1 bun test packages/providers/test/live-gemini.test.ts
 *
 * Never prints the resolved key or a raw provider payload — only redacted usage numbers.
 * `createGeminiAdapterFromEnv` (not this file) is what reads `GEMINI_API_KEY`.
 */
const wantsLiveProviderTests = process.env.RUN_LIVE_PROVIDER_TESTS === '1'
const hasGeminiCredentials = Boolean(process.env.GEMINI_API_KEY)

describe('Gemini live smoke', () => {
  test.skipIf(!wantsLiveProviderTests || !hasGeminiCredentials)(
    'produces one schema-valid, budgeted structured response',
    async () => {
      const adapter = createGeminiAdapterFromEnv()

      const Schema = z.strictObject({ headline: z.string().min(1), bulletCount: z.number().int().min(0).max(5) })
      const budget = new RunBudget({ maxTotalTokens: 2_000, deadlineAt: Date.now() + 30_000 })

      const result = await generateObject(
        adapter,
        {
          modelId: 'gemini-flash-latest',
          schema: Schema,
          schemaName: 'Schema',
          system: 'Reply with only JSON, no prose.',
          messages: [
            { role: 'user', content: 'Give a one-line headline and a bullet count for a hackathon pitch deck.' }
          ],
          stage: 'live-smoke-gemini'
        },
        budget,
        new AbortController().signal
      )

      if (!result.ok) {
        const kind = 'kind' in result.error ? result.error.kind : 'unknown'
        // The free tier's daily per-model quota (or a genuine short-term rate limit) is an
        // environmental condition, not an adapter defect — normalized correctly by the
        // adapter (see `classifyGeminiErrorResponse`), so it must not fail this test. Any
        // other failure kind is a real defect and still fails loudly below.
        if (kind === 'quota_exhausted' || kind === 'rate_limit') {
          console.warn(
            `[live-gemini] provider reported ${kind} — environmental, not a test failure. Rerun once quota/rate resets for fresh Gate-2 evidence.`
          )
          return
        }
        throw new Error(`[live-gemini] generateObject failed with kind=${kind}`)
      }

      expect(typeof result.data.headline).toBe('string')
      expect(result.data.headline.length).toBeGreaterThan(0)
      // Redacted evidence only: token/wall metrics, never prompt or response bodies.
      console.log(
        `[live-gemini] modelId=${result.usage.modelId} totalTokens=${result.usage.totalTokens} wallMs=${result.usage.wallMs}`
      )
    },
    45_000
  )
})
