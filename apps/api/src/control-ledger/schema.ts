import type { Database } from 'bun:sqlite'

/**
 * The identity/control ledger's entire schema: users, sessions, and per-user allowance
 * reservations. No `deleted_at` column anywhere — deletion is physical (Q19). This ledger
 * never carries a prompt, deck, asset, provider payload, OAuth token or raw session token.
 */
export function migrateControlLedger(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_subject TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      idle_expires_at INTEGER NOT NULL,
      absolute_expires_at INTEGER NOT NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)')

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_allowance (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      tokens_reserved INTEGER NOT NULL DEFAULT 0,
      runs_used INTEGER NOT NULL DEFAULT 0,
      runs_reserved INTEGER NOT NULL DEFAULT 0
    )
  `)
}
