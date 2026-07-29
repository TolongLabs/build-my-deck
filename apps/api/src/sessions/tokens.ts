import { createHmac, randomBytes } from 'node:crypto'

const TOKEN_BYTES = 32

/** A high-entropy opaque token — the only value that ever lives in the browser's cookie. */
export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

/**
 * The stored value is never the raw token itself — it is HMACed with the server's session
 * secret, so a leaked ledger row alone cannot be replayed as a cookie value. The token's own
 * entropy is why no additional per-row salt is needed here.
 */
export function hashToken(sessionSecret: string, rawToken: string): string {
  return createHmac('sha256', sessionSecret).update(rawToken).digest('hex')
}
