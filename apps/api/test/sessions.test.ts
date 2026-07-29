import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { migrateControlLedger } from '../src/control-ledger/schema'
import { createOrLinkUser } from '../src/identity/users'
import { createSession, deleteSession, verifySession } from '../src/sessions/store'
import type { SessionConfig } from '../src/sessions/store'

const SENTINEL_SECRET = 'sentinel-session-secret'

function freshDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrateControlLedger(db)
  return db
}

function config(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return { sessionSecret: SENTINEL_SECRET, idleTtlMs: 60_000, absoluteTtlMs: 120_000, ...overrides }
}

describe('createSession / verifySession', () => {
  test('a freshly created session verifies to the user that created it', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config())

    const verified = verifySession(db, session.token, config())
    expect(verified?.userId).toBe(user.id)
  })

  test('the raw token is never stored — only its HMAC is present in the ledger', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config())

    const row = db.query('SELECT token_hash FROM sessions WHERE user_id = ?').get(user.id) as { token_hash: string }
    expect(row.token_hash).not.toBe(session.token)
    expect(row.token_hash.includes(session.token)).toBe(false)
  })

  test('fixation is structurally impossible: no session exists until after it is created, so an attacker-supplied cookie value never verifies', () => {
    const db = freshDb()
    createOrLinkUser(db, 'gh-1')

    const forgedToken = 'attacker-supplied-cookie-value'
    expect(verifySession(db, forgedToken, config())).toBeNull()
  })

  test('a token verified against the wrong session secret is rejected, not merely mismatched by chance', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config())

    const verified = verifySession(db, session.token, config({ sessionSecret: 'a-different-secret' }))
    expect(verified).toBeNull()
  })

  test('an expired (absolute) session is rejected and garbage-collected, not silently trusted', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config({ idleTtlMs: 100_000, absoluteTtlMs: 5 }))

    await new Promise((resolve) => setTimeout(resolve, 15))

    const verified = verifySession(db, session.token, config({ idleTtlMs: 100_000, absoluteTtlMs: 5 }))
    expect(verified).toBeNull()

    const row = db.query('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(user.id) as { count: number }
    expect(row.count).toBe(0)
  })

  test('an idle-expired session is rejected even before its absolute expiry', async () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config({ idleTtlMs: 5, absoluteTtlMs: 100_000 }))

    await new Promise((resolve) => setTimeout(resolve, 15))

    const verified = verifySession(db, session.token, config({ idleTtlMs: 5, absoluteTtlMs: 100_000 }))
    expect(verified).toBeNull()
  })

  test('verifying a live session refreshes its idle window without extending past the absolute cap', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config({ idleTtlMs: 60_000, absoluteTtlMs: 60_000 }))

    verifySession(db, session.token, config({ idleTtlMs: 60_000, absoluteTtlMs: 60_000 }))

    const row = db
      .query(
        'SELECT idle_expires_at as idleExpiresAt, absolute_expires_at as absoluteExpiresAt FROM sessions WHERE user_id = ?'
      )
      .get(user.id) as { idleExpiresAt: number; absoluteExpiresAt: number }
    expect(row.idleExpiresAt).toBeLessThanOrEqual(row.absoluteExpiresAt)
  })

  test('sign-in always issues a brand-new token — two sessions for the same user never share one', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const first = createSession(db, user.id, config())
    const second = createSession(db, user.id, config())

    expect(first.token).not.toBe(second.token)
    const count = (
      db.query('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(user.id) as { count: number }
    ).count
    expect(count).toBe(2)
  })
})

describe('deleteSession', () => {
  test('sign-out deletes the session so it can no longer authenticate', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, config())

    deleteSession(db, session.token, config())

    expect(verifySession(db, session.token, config())).toBeNull()
  })

  test('deleting an unknown token is a no-op, not an error', () => {
    const db = freshDb()
    expect(() => deleteSession(db, 'never-issued-token', config())).not.toThrow()
  })
})
