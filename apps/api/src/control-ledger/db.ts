import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { migrateControlLedger } from './schema'

/** `${dataDir}/control.sqlite` — the reserved `/data` volume convention from `docs/trd.md`. */
export function controlLedgerPath(dataDir: string): string {
  return `${dataDir}/control.sqlite`
}

/**
 * Opens (creating if absent) the identity/control ledger and ensures its schema exists.
 * `PRAGMA foreign_keys` is a per-connection setting in SQLite — it must be set here, on
 * every open, not only once in the schema, or cascade deletes silently stop cascading.
 */
export function openControlLedger(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })

  const db = new Database(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA journal_mode = WAL')
  migrateControlLedger(db)
  return db
}
