import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { loadConfig } from '../src/config'
import { migrateControlLedger } from '../src/control-ledger/schema'
import { createApp } from '../src/server'

describe('loadConfig', () => {
  test('applies safe finite defaults when nothing is configured (non-production)', () => {
    const config = loadConfig({})
    expect(config.port).toBeGreaterThan(0)
    expect(Number.isFinite(config.maxInputBytes)).toBe(true)
    expect(Number.isFinite(config.runBudgetDefaults.maxTotalTokens)).toBe(true)
    expect(Number.isFinite(config.runBudgetDefaults.maxWallMs)).toBe(true)
  })

  test('derives the development public origin from the configured port', () => {
    const config = loadConfig({ PORT: '5173' })
    expect(config.publicOrigin).toBe('http://localhost:5173')
  })

  test('tests can inject explicit small values, overriding the defaults', () => {
    const config = loadConfig({ MAX_RUN_TOTAL_TOKENS: '10', MAX_RUN_WALL_MS: '5', MAX_INPUT_BYTES: '20' })
    expect(config.runBudgetDefaults.maxTotalTokens).toBe(10)
    expect(config.runBudgetDefaults.maxWallMs).toBe(5)
    expect(config.maxInputBytes).toBe(20)
  })

  test('production fails closed if a budget/input limit or the public origin is missing', () => {
    expect(() => loadConfig({}, { production: true })).toThrow()
    expect(() => loadConfig({ MAX_RUN_TOTAL_TOKENS: '10', MAX_RUN_WALL_MS: '5' }, { production: true })).toThrow(
      /MAX_INPUT_BYTES/
    )
    expect(() =>
      loadConfig({ MAX_RUN_TOTAL_TOKENS: '10', MAX_RUN_WALL_MS: '5', MAX_INPUT_BYTES: '20' }, { production: true })
    ).toThrow(/PUBLIC_ORIGIN/)
  })

  test('production starts once all three run-budget values are explicit and finite', () => {
    const config = loadConfig(
      {
        MAX_RUN_TOTAL_TOKENS: '10',
        MAX_RUN_WALL_MS: '5',
        MAX_INPUT_BYTES: '20',
        PUBLIC_ORIGIN: 'https://app.example'
      },
      { production: true }
    )
    expect(config.runBudgetDefaults.maxTotalTokens).toBe(10)
    expect(config.publicOrigin).toBe('https://app.example')
  })

  test('rejects a non-integer or non-positive override rather than silently ignoring it', () => {
    expect(() => loadConfig({ MAX_CONCURRENT_RUNS: '0' })).toThrow()
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow()
  })
})

describe('createApp', () => {
  function freshDb(): Database {
    const db = new Database(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    migrateControlLedger(db)
    return db
  }

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

  test('rejects a cross-origin POST to the mounted sign-out route before its terminal handler runs', async () => {
    const app = createApp(loadConfig({}), {
      staticDir: '/nonexistent-static-dir-for-tests',
      controlLedgerDb: freshDb(),
      env: { SESSION_SECRET: 'test-session-secret' }
    })

    const response = await app.request('/api/auth/signout', {
      method: 'POST',
      headers: { origin: 'https://evil.example' }
    })

    expect(response.status).toBe(403)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('unauthorized')
  })
})
