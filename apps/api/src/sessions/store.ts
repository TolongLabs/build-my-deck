import type { Database } from 'bun:sqlite'
import { generateOpaqueToken, hashToken } from './tokens'

export interface SessionTtlConfig {
  idleTtlMs: number
  absoluteTtlMs: number
}

export interface SessionConfig extends SessionTtlConfig {
  sessionSecret: string
}

export const DEFAULT_SESSION_TTL: SessionTtlConfig = {
  idleTtlMs: 14 * 24 * 60 * 60 * 1000,
  absoluteTtlMs: 30 * 24 * 60 * 60 * 1000
}

export interface SessionInfo {
  userId: string
  absoluteExpiresAt: number
}

export interface CreatedSession {
  token: string
  absoluteExpiresAt: number
}

/**
 * Always issues a brand-new, server-generated token — there is no pre-auth session that
 * sign-in "upgrades", so the flow is fixation-proof by construction rather than by policy.
 */
export function createSession(db: Database, userId: string, config: SessionConfig): CreatedSession {
  const token = generateOpaqueToken()
  const now = Date.now()
  const absoluteExpiresAt = now + config.absoluteTtlMs
  const idleExpiresAt = Math.min(now + config.idleTtlMs, absoluteExpiresAt)

  db.query(
    'INSERT INTO sessions (id, user_id, token_hash, created_at, idle_expires_at, absolute_expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), userId, hashToken(config.sessionSecret, token), now, idleExpiresAt, absoluteExpiresAt)

  return { token, absoluteExpiresAt }
}

interface SessionRow {
  id: string
  userId: string
  idleExpiresAt: number
  absoluteExpiresAt: number
}

/**
 * Verifies a raw cookie value against the stored hash and expiry. A match refreshes the
 * idle window, capped at the absolute expiry; an expired or unmatched token is rejected and,
 * if a stale row was found, opportunistically garbage-collected — never silently trusted.
 */
export function verifySession(db: Database, rawToken: string, config: SessionConfig): SessionInfo | null {
  const hash = hashToken(config.sessionSecret, rawToken)
  const row = db
    .query(
      'SELECT id, user_id as userId, idle_expires_at as idleExpiresAt, absolute_expires_at as absoluteExpiresAt FROM sessions WHERE token_hash = ?'
    )
    .get(hash) as SessionRow | null

  if (!row) return null

  const now = Date.now()
  if (now >= row.idleExpiresAt || now >= row.absoluteExpiresAt) {
    db.query('DELETE FROM sessions WHERE id = ?').run(row.id)
    return null
  }

  const idleExpiresAt = Math.min(now + config.idleTtlMs, row.absoluteExpiresAt)
  db.query('UPDATE sessions SET idle_expires_at = ? WHERE id = ?').run(idleExpiresAt, row.id)

  return { userId: row.userId, absoluteExpiresAt: row.absoluteExpiresAt }
}

/** Deletes the session matching this raw token, if any. Deleting an unknown token is a no-op, not an error. */
export function deleteSession(db: Database, rawToken: string, config: Pick<SessionConfig, 'sessionSecret'>): void {
  const hash = hashToken(config.sessionSecret, rawToken)
  db.query('DELETE FROM sessions WHERE token_hash = ?').run(hash)
}
