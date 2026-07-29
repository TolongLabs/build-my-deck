import { expect } from 'bun:test'
import { z } from 'zod'
import type { ProviderAdapter } from '../src/adapter'
import { generateObject } from '../src/generate-object'
import { RunBudget } from '../src/run-budget'

export const ConformanceSchema = z.strictObject({
  headline: z.string().min(1),
  bulletCount: z.number().int().min(0)
})

/**
 * The identical conformance suite every adapter runs — fixture, noisy and both live
 * adapters alike — so provider heterogeneity is an executable property rather than an
 * assumption.
 */
export async function assertProviderConformance(adapter: ProviderAdapter, modelId: string): Promise<void> {
  expect(adapter.descriptor.id.length).toBeGreaterThan(0)
  const model = adapter.listModels().find((candidate) => candidate.id === modelId)
  expect(model).toBeDefined()

  const budget = new RunBudget({ maxTotalTokens: 20_000, deadlineAt: Date.now() + 30_000 })
  const result = await generateObject(
    adapter,
    {
      modelId,
      schema: ConformanceSchema,
      schemaName: 'ConformanceSchema',
      system: 'You produce a short headline and a bullet count as JSON.',
      messages: [{ role: 'user', content: 'Summarize: build-my-deck ships a hosted pitch-deck generator.' }],
      stage: 'conformance'
    },
    budget,
    new AbortController().signal
  )

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(typeof result.data.headline).toBe('string')
    expect(result.data.headline.length).toBeGreaterThan(0)
    expect(result.usage.modelId).toBe(modelId)
    expect(result.usage.totalTokens).toBeGreaterThanOrEqual(0)
  }
}
