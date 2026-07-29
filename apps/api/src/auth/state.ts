import { randomBytes } from 'node:crypto'

export interface OAuthStateEntry {
  returnTo: string
  expiresAt: number
}

/** Long enough to complete a real GitHub login, short enough to bound the replay window. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

/**
 * Single-use CSRF `state` for the OAuth authorization-code flow — deliberately in-memory and
 * unpersisted: `docs/trd.md`'s ledger enumerates only users/sessions/allowance rows, and a
 * `state` value is meaningless after one exchange (or after this short TTL) regardless.
 */
export class OAuthStateStore {
  #entries = new Map<string, OAuthStateEntry>()

  issue(returnTo: string): string {
    const state = randomBytes(32).toString('hex')
    this.#entries.set(state, { returnTo, expiresAt: Date.now() + OAUTH_STATE_TTL_MS })
    return state
  }

  /** Consumes (deletes) the state regardless of outcome, so a forged or replayed value can never be reused. */
  consume(state: string): { ok: true; returnTo: string } | { ok: false } {
    const entry = this.#entries.get(state)
    this.#entries.delete(state)
    if (!entry || Date.now() >= entry.expiresAt) return { ok: false }
    return { ok: true, returnTo: entry.returnTo }
  }
}
