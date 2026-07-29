import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'
import { migrateControlLedger } from '../src/control-ledger/schema'
import { createOrLinkUser, deleteUserCascade, getUserById } from '../src/identity/users'

function freshDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrateControlLedger(db)
  return db
}

describe('createOrLinkUser', () => {
  test('creates a new local user for an unseen GitHub subject', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    expect(user.githubSubject).toBe('gh-1')
    expect(getUserById(db, user.id)).toEqual(user)
  })

  test('is idempotent by subject — a repeat sign-in links to the same user, not a duplicate', () => {
    const db = freshDb()
    const first = createOrLinkUser(db, 'gh-2')
    const second = createOrLinkUser(db, 'gh-2')

    expect(second.id).toBe(first.id)
    const count = (db.query('SELECT COUNT(*) as count FROM users').get() as { count: number }).count
    expect(count).toBe(1)
  })

  test('two different subjects never collapse into the same local user', () => {
    const db = freshDb()
    const a = createOrLinkUser(db, 'gh-a')
    const b = createOrLinkUser(db, 'gh-b')

    expect(a.id).not.toBe(b.id)
  })
})

describe('deleteUserCascade', () => {
  function seedUserWithLinkedRows(db: Database) {
    const user = createOrLinkUser(db, 'gh-delete-me')
    db.query(
      'INSERT INTO sessions (id, user_id, token_hash, created_at, idle_expires_at, absolute_expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), user.id, 'sentinel-hash-1', Date.now(), Date.now() + 1000, Date.now() + 1000)
    db.query(
      'INSERT INTO sessions (id, user_id, token_hash, created_at, idle_expires_at, absolute_expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), user.id, 'sentinel-hash-2', Date.now(), Date.now() + 1000, Date.now() + 1000)
    db.query('INSERT INTO user_allowance (user_id, tokens_used, runs_used) VALUES (?, ?, ?)').run(user.id, 500, 2)
    return user
  }

  test('physically removes the user and every user-linked row — no tombstone, real row counts', () => {
    const db = freshDb()
    const user = seedUserWithLinkedRows(db)

    const result = deleteUserCascade(db, user.id)

    expect(result.sessionsDeleted).toBe(2)
    expect(result.allowanceRowsDeleted).toBe(1)
    expect(getUserById(db, user.id)).toBeNull()
    expect(
      (db.query('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(user.id) as { count: number }).count
    ).toBe(0)
    expect(
      (db.query('SELECT COUNT(*) as count FROM user_allowance WHERE user_id = ?').get(user.id) as { count: number })
        .count
    ).toBe(0)
  })

  test('a second delete against an already-deleted user is idempotently absent, not an error', () => {
    const db = freshDb()
    const user = seedUserWithLinkedRows(db)
    deleteUserCascade(db, user.id)

    const second = deleteUserCascade(db, user.id)
    expect(second.sessionsDeleted).toBe(0)
    expect(second.allowanceRowsDeleted).toBe(0)
  })

  test("deleting one user never touches another user's rows", () => {
    const db = freshDb()
    const victim = seedUserWithLinkedRows(db)
    const bystander = createOrLinkUser(db, 'gh-bystander')
    db.query('INSERT INTO user_allowance (user_id, tokens_used) VALUES (?, ?)').run(bystander.id, 42)

    deleteUserCascade(db, victim.id)

    expect(getUserById(db, bystander.id)).not.toBeNull()
    const bystanderAllowance = db
      .query('SELECT tokens_used FROM user_allowance WHERE user_id = ?')
      .get(bystander.id) as {
      tokens_used: number
    }
    expect(bystanderAllowance.tokens_used).toBe(42)
  })

  test('teeth check: a cascade that silently failed to remove sessions is caught, not swallowed', () => {
    // Disabling foreign_keys reproduces what a broken cascade would look like: the DELETE FROM
    // users succeeds but the session row is orphaned rather than removed.
    const db = new Database(':memory:')
    migrateControlLedger(db) // foreign_keys left OFF (Bun's default), so ON DELETE CASCADE will not fire
    const user = seedUserWithLinkedRows(db)

    expect(() => deleteUserCascade(db, user.id)).toThrow('Account deletion left a user-linked control row behind')
  })
})
