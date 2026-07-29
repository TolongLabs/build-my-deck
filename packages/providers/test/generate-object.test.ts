import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import type { CompletionRequest, CompletionResult, ProviderAdapter } from '../src/adapter'
import { FIXTURE_MODELS, createFixtureAdapter } from '../src/adapters/fixture'
import { createNoisyAdapter } from '../src/adapters/noisy'
import { ProviderError } from '../src/errors'
import { generateObject } from '../src/generate-object'
import { RunBudget } from '../src/run-budget'

const Schema = z.strictObject({ headline: z.string().min(1), bulletCount: z.number().int() })

function budget(maxTotalTokens = 20_000): RunBudget {
  return new RunBudget({ maxTotalTokens, deadlineAt: Date.now() + 30_000 })
}

describe('generateObject', () => {
  for (const model of FIXTURE_MODELS) {
    test(`succeeds against the ${model.capabilities.structuredOutputTier} tier`, async () => {
      const adapter = createFixtureAdapter(() => ({ headline: 'Judge-ready in one pass', bulletCount: 3 }))

      const result = await generateObject(
        adapter,
        {
          modelId: model.id,
          schema: Schema,
          schemaName: 'Schema',
          messages: [{ role: 'user', content: 'Describe the deck.' }],
          stage: 'test-stage'
        },
        budget(),
        new AbortController().signal
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.headline).toBe('Judge-ready in one pass')
        expect(result.usage.stage).toBe('test-stage')
        expect(result.usage.modelId).toBe(model.id)
      }
    })
  }

  test('an unsupported schema keyword fails before any adapter call', async () => {
    const UnionSchema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('a'), headline: z.string() }),
      z.strictObject({ kind: z.literal('b'), bulletCount: z.number() })
    ])
    let callCount = 0
    const adapter = createFixtureAdapter(() => {
      callCount += 1
      return { kind: 'a', headline: 'unused' }
    })

    await expect(
      generateObject(
        adapter,
        {
          modelId: 'fixture-native-json-schema',
          schema: UnionSchema,
          schemaName: 'UnionSchema',
          messages: [{ role: 'user', content: 'Describe.' }],
          stage: 'lint-stage'
        },
        budget(),
        new AbortController().signal
      )
    ).rejects.toThrow()
    expect(callCount).toBe(0)
  })

  test('the noisy adapter recovers within the one bounded correction request', async () => {
    const adapter = createNoisyAdapter(() => ({ headline: 'Recovered headline', bulletCount: 2 }))

    const result = await generateObject(
      adapter,
      {
        modelId: 'noisy-prompt-only',
        schema: Schema,
        schemaName: 'Schema',
        messages: [{ role: 'user', content: 'noisy-case-1' }],
        stage: 'noisy-stage'
      },
      budget(),
      new AbortController().signal
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.headline).toBe('Recovered headline')
      expect(result.usage.attempt).toBe(2)
    }
  })

  test('a refusal gets at most one neutral retry', async () => {
    let calls = 0
    const adapter: ProviderAdapter = {
      descriptor: { id: 'refusing', name: 'Refusing Test Adapter' },
      listModels: () => FIXTURE_MODELS,
      async complete(_request: CompletionRequest, _signal: AbortSignal): Promise<CompletionResult> {
        calls += 1
        if (calls === 1) throw new ProviderError('refusal', 'initial refusal')
        return {
          text: JSON.stringify({ headline: 'After retry', bulletCount: 1 }),
          usage: { inputTokens: 1, outputTokens: 1 },
          finishReason: 'stop'
        }
      }
    }

    const result = await generateObject(
      adapter,
      {
        modelId: 'fixture-native-json-schema',
        schema: Schema,
        schemaName: 'Schema',
        messages: [{ role: 'user', content: 'Ask something sensitive.' }],
        stage: 'refusal-stage'
      },
      budget(),
      new AbortController().signal
    )

    expect(calls).toBe(2)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.headline).toBe('After retry')
  })

  test('a persistent refusal is returned as a normalized error, never inspected by the caller', async () => {
    const adapter: ProviderAdapter = {
      descriptor: { id: 'always-refusing', name: 'Always Refusing' },
      listModels: () => FIXTURE_MODELS,
      async complete(): Promise<CompletionResult> {
        throw new ProviderError('refusal', 'always refuses')
      }
    }

    const result = await generateObject(
      adapter,
      {
        modelId: 'fixture-native-json-schema',
        schema: Schema,
        schemaName: 'Schema',
        messages: [{ role: 'user', content: 'Ask something sensitive.' }],
        stage: 'refusal-stage'
      },
      budget(),
      new AbortController().signal
    )

    expect(result.ok).toBe(false)
    if (!result.ok && 'kind' in result.error) expect(result.error.kind).toBe('refusal')
  })

  test('exhaustion of the run budget aborts before the next paid call', async () => {
    let calls = 0
    const adapter = createFixtureAdapter(() => {
      calls += 1
      return { headline: 'x', bulletCount: 1 }
    })

    const tinyBudget = new RunBudget({ maxTotalTokens: 1, deadlineAt: Date.now() + 10_000 })
    const result = await generateObject(
      adapter,
      {
        modelId: 'fixture-native-json-schema',
        schema: Schema,
        schemaName: 'Schema',
        messages: [{ role: 'user', content: 'A fairly long message that exceeds the tiny token budget.' }],
        stage: 'budget-stage'
      },
      tinyBudget,
      new AbortController().signal
    )

    expect(result.ok).toBe(false)
    if (!result.ok && 'kind' in result.error) expect(result.error.kind).toBe('run_budget_exceeded')
    expect(calls).toBe(0)
  })

  test('an aborted signal is honoured before the next call starts', async () => {
    const controller = new AbortController()
    controller.abort()
    let calls = 0
    const adapter = createFixtureAdapter(() => {
      calls += 1
      return { headline: 'x', bulletCount: 1 }
    })

    const result = await generateObject(
      adapter,
      {
        modelId: 'fixture-native-json-schema',
        schema: Schema,
        schemaName: 'Schema',
        messages: [{ role: 'user', content: 'irrelevant' }],
        stage: 'abort-stage'
      },
      budget(),
      controller.signal
    )

    expect(result.ok).toBe(false)
    expect(calls).toBe(0)
  })
})
