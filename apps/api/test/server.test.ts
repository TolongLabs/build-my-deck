import { describe, expect, test } from 'bun:test'
import { loadConfig } from '../src/config'
import { createApp } from '../src/server'

describe('loadConfig', () => {
  test('applies safe finite defaults when nothing is configured (non-production)', () => {
    const config = loadConfig({})
    expect(config.port).toBeGreaterThan(0)
    expect(Number.isFinite(config.maxInputBytes)).toBe(true)
    expect(Number.isFinite(config.runBudgetDefaults.maxTotalTokens)).toBe(true)
    expect(Number.isFinite(config.runBudgetDefaults.maxWallMs)).toBe(true)
  })

  test('tests can inject explicit small values, overriding the defaults', () => {
    const config = loadConfig({ MAX_RUN_TOTAL_TOKENS: '10', MAX_RUN_WALL_MS: '5', MAX_INPUT_BYTES: '20' })
    expect(config.runBudgetDefaults.maxTotalTokens).toBe(10)
    expect(config.runBudgetDefaults.maxWallMs).toBe(5)
    expect(config.maxInputBytes).toBe(20)
  })

  test('production fails closed if the token ceiling, wall deadline or input-byte limit is missing', () => {
    expect(() => loadConfig({}, { production: true })).toThrow()
    expect(() => loadConfig({ MAX_RUN_TOTAL_TOKENS: '10', MAX_RUN_WALL_MS: '5' }, { production: true })).toThrow(
      /MAX_INPUT_BYTES/
    )
  })

  test('production starts once all three run-budget values are explicit and finite', () => {
    const config = loadConfig(
      { MAX_RUN_TOTAL_TOKENS: '10', MAX_RUN_WALL_MS: '5', MAX_INPUT_BYTES: '20' },
      { production: true }
    )
    expect(config.runBudgetDefaults.maxTotalTokens).toBe(10)
  })

  test('rejects a non-integer or non-positive override rather than silently ignoring it', () => {
    expect(() => loadConfig({ MAX_CONCURRENT_RUNS: '0' })).toThrow()
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow()
  })
})

describe('createApp', () => {
  test('GET /api/health responds ok', async () => {
    const app = createApp(loadConfig({}), { staticDir: '/nonexistent-static-dir-for-tests' })
    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  test('bounds request bodies before any mounted route can parse paid content', async () => {
    const app = createApp(loadConfig({ MAX_INPUT_BYTES: '10' }), {
      staticDir: '/nonexistent-static-dir-for-tests'
    })
    const response = await app.request('/api/generation/slide', {
      method: 'POST',
      body: 'x'.repeat(1_000)
    })

    expect(response.status).toBe(413)
  })

  test('an unknown path with no built web bundle falls through to a plain 404, not a crash', async () => {
    const app = createApp(loadConfig({}), { staticDir: '/nonexistent-static-dir-for-tests' })
    const response = await app.request('/does-not-exist')

    expect(response.status).toBe(404)
  })
})
