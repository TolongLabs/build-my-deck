import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { loadConfig } from '../src/config'
import { migrateControlLedger } from '../src/control-ledger/schema'
import { createOrLinkUser } from '../src/identity/users'
import { createApp } from '../src/server'
import { SESSION_COOKIE_NAME } from '../src/sessions/cookies'
import { createSession } from '../src/sessions/store'

const SENTINEL_SESSION_SECRET = 'sentinel-session-secret'
const env = { SESSION_SECRET: SENTINEL_SESSION_SECRET }
const DEV_ORIGIN = loadConfig({}).publicOrigin

function freshDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrateControlLedger(db)
  return db
}

function appWith(db: Database, config = loadConfig({})) {
  return createApp(config, { staticDir: '/nonexistent-static-dir-for-tests', controlLedgerDb: db, env })
}

function signedInCookie(db: Database, userId: string): string {
  const session = createSession(db, userId, {
    sessionSecret: SENTINEL_SESSION_SECRET,
    idleTtlMs: 60_000,
    absoluteTtlMs: 60_000
  })
  return `${SESSION_COOKIE_NAME}=${session.token}`
}

describe('GET /api/access/status', () => {
  test('reports unauthenticated with no cookie', async () => {
    const app = appWith(freshDb())
    const response = await app.request('/api/access/status')

    expect(await response.json()).toEqual({ authenticated: false })
  })

  test('reports the authenticated user id with a valid session cookie', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db)

    const response = await app.request('/api/access/status', { headers: { cookie: signedInCookie(db, user.id) } })
    expect(await response.json()).toEqual({ authenticated: true, userId: user.id })
  })

  test('a forged cookie value never authenticates', async () => {
    const app = appWith(freshDb())
    const response = await app.request('/api/access/status', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=forged-value` }
    })

    expect(await response.json()).toEqual({ authenticated: false })
  })
})

describe('DELETE /api/account', () => {
  test('an unauthenticated request is rejected and deletes nothing', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db)

    const response = await app.request('/api/account', { method: 'DELETE', headers: { origin: DEV_ORIGIN } })
    expect(response.status).toBe(401)

    const row = db.query('SELECT COUNT(*) as count FROM users WHERE id = ?').get(user.id) as { count: number }
    expect(row.count).toBe(1)
  })

  test('an authenticated owner deletes their own account, its sessions and allowance rows, and clears the cookie', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    db.query('INSERT INTO user_allowance (user_id, tokens_used) VALUES (?, ?)').run(user.id, 10)
    const app = appWith(db)
    const cookie = signedInCookie(db, user.id)

    const response = await app.request('/api/account', {
      method: 'DELETE',
      headers: { cookie, origin: DEV_ORIGIN }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=;`)

    const row = db.query('SELECT COUNT(*) as count FROM users WHERE id = ?').get(user.id) as { count: number }
    expect(row.count).toBe(0)
  })

  test("the deleted account's old session cookie can no longer authenticate anywhere", async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db)
    const cookie = signedInCookie(db, user.id)

    await app.request('/api/account', { method: 'DELETE', headers: { cookie, origin: DEV_ORIGIN } })

    const statusResponse = await app.request('/api/access/status', { headers: { cookie } })
    expect(await statusResponse.json()).toEqual({ authenticated: false })
  })

  test('a second delete against an already-deleted account is rejected as unauthenticated, not a crash — no tombstone to re-delete', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db)
    const cookie = signedInCookie(db, user.id)

    await app.request('/api/account', { method: 'DELETE', headers: { cookie, origin: DEV_ORIGIN } })
    const second = await app.request('/api/account', {
      method: 'DELETE',
      headers: { cookie, origin: DEV_ORIGIN }
    })

    expect(second.status).toBe(401)
  })

  test("deleting one account never removes another user's row", async () => {
    const db = freshDb()
    const victim = createOrLinkUser(db, 'gh-victim')
    const bystander = createOrLinkUser(db, 'gh-bystander')
    const app = appWith(db)

    await app.request('/api/account', {
      method: 'DELETE',
      headers: { cookie: signedInCookie(db, victim.id), origin: DEV_ORIGIN }
    })

    const row = db.query('SELECT COUNT(*) as count FROM users WHERE id = ?').get(bystander.id) as { count: number }
    expect(row.count).toBe(1)
  })

  test('a cross-origin Origin header is rejected before any deletion happens', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db)
    const cookie = signedInCookie(db, user.id)

    const response = await app.request('/api/account', {
      method: 'DELETE',
      headers: { cookie, origin: 'https://evil.example' }
    })

    expect(response.status).toBe(403)
    const row = db.query('SELECT COUNT(*) as count FROM users WHERE id = ?').get(user.id) as { count: number }
    expect(row.count).toBe(1)
  })

  test('a missing Origin header is rejected before any deletion happens', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db)
    const cookie = signedInCookie(db, user.id)

    const response = await app.request('/api/account', { method: 'DELETE', headers: { cookie } })

    expect(response.status).toBe(403)
    const row = db.query('SELECT COUNT(*) as count FROM users WHERE id = ?').get(user.id) as { count: number }
    expect(row.count).toBe(1)
  })

  test('accepts the configured public HTTPS origin instead of deriving one from the internal request URL', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const app = appWith(db, loadConfig({ PUBLIC_ORIGIN: 'https://app.example' }))
    const cookie = signedInCookie(db, user.id)

    const response = await app.request('/api/account', {
      method: 'DELETE',
      headers: { cookie, origin: 'https://app.example' }
    })

    expect(response.status).toBe(200)
  })
})
