import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { createQwenAdapterFromEnv } from '../src/adapters/openai-compatible'
import { generateObject } from '../src/generate-object'
import { RunBudget } from '../src/run-budget'

/**
 * Opt-in *and* env-gated: a developer having `DASHSCOPE_API_KEY`/`QWEN_BASE_URL` configured
 * in `.env` must not change which tests `bun test` runs by default — otherwise a real
 * network call silently rides along on every default run. Run this deliberately:
 *
 *   RUN_LIVE_PROVIDER_TESTS=1 bun test packages/providers/test/live-qwen.test.ts
 *
 * Never prints the resolved key or a raw provider payload — only redacted usage numbers.
 * `createQwenAdapterFromEnv` (not this file) is what reads `DASHSCOPE_API_KEY`/`QWEN_BASE_URL`.
 */
const wantsLiveProviderTests = process.env.RUN_LIVE_PROVIDER_TESTS === '1'
const hasQwenCredentials = Boolean(process.env.DASHSCOPE_API_KEY && process.env.QWEN_BASE_URL)

describe('Qwen (DashScope) live smoke', () => {
  test.skipIf(!wantsLiveProviderTests || !hasQwenCredentials)(
    'produces one schema-valid, budgeted structured response',
    async () => {
      const adapter = createQwenAdapterFromEnv()

      const Schema = z.strictObject({ headline: z.string().min(1), bulletCount: z.number().int().min(0).max(5) })
      const budget = new RunBudget({ maxTotalTokens: 2_000, deadlineAt: Date.now() + 30_000 })

      const result = await generateObject(
        adapter,
        {
          modelId: 'qwen-plus',
          schema: Schema,
          schemaName: 'Schema',
          system: 'Reply with only JSON, no prose.',
          messages: [
            { role: 'user', content: 'Give a one-line headline and a bullet count for a hackathon pitch deck.' }
          ],
          stage: 'live-smoke-qwen'
        },
        budget,
        new AbortController().signal
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(typeof result.data.headline).toBe('string')
        expect(result.data.headline.length).toBeGreaterThan(0)
        // Redacted evidence only: token/wall metrics, never prompt or response bodies.
        console.log(
          `[live-qwen] modelId=${result.usage.modelId} totalTokens=${result.usage.totalTokens} wallMs=${result.usage.wallMs}`
        )
      }
    },
    45_000
  )
})
