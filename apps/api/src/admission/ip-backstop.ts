import { createHmac } from 'node:crypto'

export interface IpBackstopConfig {
  ipHashSecret: string
  windowMs: number
  maxAttemptsPerWindow: number
}

export const DEFAULT_IP_BACKSTOP_WINDOW_MS = 60 * 60 * 1000
/** Generous by design — a shared hackathon-venue network must keep working; this is a backstop, not the primary control. */
export const DEFAULT_IP_BACKSTOP_MAX_ATTEMPTS = 30

/** Coarsens an address to its /24 (IPv4) or /48 (IPv6) prefix before it is ever hashed — never the exact host. */
export function normalizeIp(ip: string): string {
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':')
  const octets = ip.split('.')
  return octets.length === 4 ? `${octets.slice(0, 3).join('.')}.0/24` : ip
}

export function hashIp(ipHashSecret: string, ip: string): string {
  return createHmac('sha256', ipHashSecret).update(normalizeIp(ip)).digest('hex')
}

interface Bucket {
  windowStart: number
  count: number
}

/**
 * A coarse, in-memory abuse backstop — never the primary control (per-user allowance is).
 * Deliberately not persisted: `docs/trd.md`'s ledger enumerates only users/sessions/allowance
 * rows, and resetting on restart is an acceptable trade-off for a secondary layer that never
 * stores a raw IP either way.
 */
export class IpBackstop {
  #buckets = new Map<string, Bucket>()
  #config: IpBackstopConfig

  constructor(config: IpBackstopConfig) {
    this.#config = config
  }

  /** Counts this attempt against the hashed-IP bucket and returns whether it is still under the coarse ceiling. */
  attempt(ip: string): boolean {
    const key = hashIp(this.#config.ipHashSecret, ip)
    const now = Date.now()
    const existing = this.#buckets.get(key)

    if (!existing || now - existing.windowStart >= this.#config.windowMs) {
      this.#buckets.set(key, { windowStart: now, count: 1 })
      return this.#config.maxAttemptsPerWindow >= 1
    }

    existing.count += 1
    return existing.count <= this.#config.maxAttemptsPerWindow
  }
}
