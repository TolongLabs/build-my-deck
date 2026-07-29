import type { Database } from 'bun:sqlite'

export interface ControlUser {
  id: string
  githubSubject: string
  createdAt: number
}

export interface AccountDeletionResult {
  userId: string
  sessionsDeleted: number
  allowanceRowsDeleted: number
}

/** Creates a local user for a GitHub subject, or returns the existing linked user. Idempotent by subject. */
export function createOrLinkUser(db: Database, githubSubject: string): ControlUser {
  const existing = db
    .query('SELECT id, github_subject as githubSubject, created_at as createdAt FROM users WHERE github_subject = ?')
    .get(githubSubject) as ControlUser | null
  if (existing) return existing

  const user: ControlUser = { id: crypto.randomUUID(), githubSubject, createdAt: Date.now() }
  db.query('INSERT INTO users (id, github_subject, created_at) VALUES (?, ?, ?)').run(
    user.id,
    user.githubSubject,
    user.createdAt
  )
  return user
}

export function getUserById(db: Database, userId: string): ControlUser | null {
  return (
    (db
      .query('SELECT id, github_subject as githubSubject, created_at as createdAt FROM users WHERE id = ?')
      .get(userId) as ControlUser | null) ?? null
  )
}

/**
 * Physically deletes the user plus every user-linked control row in one transaction.
 * Sessions and allowance rows cascade via `ON DELETE CASCADE`; the post-delete counts are
 * asserted rather than assumed, so a broken cascade fails loudly instead of leaving a
 * silent tombstone. A second call against an already-deleted user affects zero rows —
 * idempotent absence, not an error.
 */
export function deleteUserCascade(db: Database, userId: string): AccountDeletionResult {
  const run = db.transaction((id: string) => {
    const sessionsBefore = (
      db.query('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(id) as {
        count: number
      }
    ).count
    const allowanceBefore = (
      db.query('SELECT COUNT(*) as count FROM user_allowance WHERE user_id = ?').get(id) as { count: number }
    ).count

    db.query('DELETE FROM users WHERE id = ?').run(id)

    const sessionsAfter = (
      db.query('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(id) as {
        count: number
      }
    ).count
    const allowanceAfter = (
      db.query('SELECT COUNT(*) as count FROM user_allowance WHERE user_id = ?').get(id) as { count: number }
    ).count

    if (sessionsAfter !== 0 || allowanceAfter !== 0) {
      throw new Error('Account deletion left a user-linked control row behind')
    }

    return { userId: id, sessionsDeleted: sessionsBefore, allowanceRowsDeleted: allowanceBefore }
  })

  return run(userId)
}
