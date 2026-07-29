import type { Database } from 'bun:sqlite'
import type { SessionInfo } from '../sessions/store'

/**
 * Global `hono` context-variable typing, so `c.set`/`c.get` are typed consistently across
 * every route file without each one declaring its own `Hono<{ Variables: ... }>` generic —
 * required because task-1's pre-mounted `access`/`account` route files are plain `Hono`
 * instances composed by an index this task does not own.
 */
declare module 'hono' {
  interface ContextVariableMap {
    session: SessionInfo | null
    controlLedger: Database
  }
}
