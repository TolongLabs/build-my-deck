import { describe, test } from 'bun:test'
import { FIXTURE_MODELS, createFixtureAdapter } from '../src/adapters/fixture'
import { NOISY_MODELS, createNoisyAdapter } from '../src/adapters/noisy'
import { assertProviderConformance } from './conformance'

describe('deterministic test adapters', () => {
  for (const model of FIXTURE_MODELS) {
    test(`fixture adapter conforms for ${model.id}`, async () => {
      const adapter = createFixtureAdapter(() => ({ headline: 'Fixture headline', bulletCount: 3 }))
      await assertProviderConformance(adapter, model.id)
    })
  }

  for (const model of NOISY_MODELS) {
    test(`noisy adapter conforms for ${model.id}`, async () => {
      const adapter = createNoisyAdapter(() => ({ headline: 'Noisy headline', bulletCount: 3 }))
      await assertProviderConformance(adapter, model.id)
    })
  }
})
