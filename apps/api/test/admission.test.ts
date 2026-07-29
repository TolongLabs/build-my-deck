import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import type { AllowanceCeilings } from '../src/admission/allowance'
import { reserveAllowance } from '../src/admission/allowance'
import { admitGenerationRequest } from '../src/admission/compose'
import type { AdmissionDeps } from '../src/admission/compose'
import {
  DEFAULT_IP_BACKSTOP_MAX_ATTEMPTS,
  DEFAULT_IP_BACKSTOP_WINDOW_MS,
  IpBackstop,
  hashIp,
  normalizeIp
} from '../src/admission/ip-backstop'
import { isOwner } from '../src/admission/owner-guard'
import { GenerationSemaphore } from '../src/concurrency/generation-semaphore'
import { migrateControlLedger } from '../src/control-ledger/schema'
import { createOrLinkUser } from '../src/identity/users'
import { createSession } from '../src/sessions/store'
import type { SessionConfig } from '../src/sessions/store'

const SENTINEL_IP_SECRET = 'sentinel-ip-hash-secret'
const SENTINEL_SESSION_SECRET = 'sentinel-session-secret'

function freshDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrateControlLedger(db)
  return db
}

const sessionConfig: SessionConfig = {
  sessionSecret: SENTINEL_SESSION_SECRET,
  idleTtlMs: 60_000,
  absoluteTtlMs: 60_000
}

describe('isOwner', () => {
  const resource = { ownerId: 'user-1' }

  test('owner, non-owner and unauthenticated fixtures produce allow / deny / deny', () => {
    expect(isOwner({ userId: 'user-1' }, resource)).toBe(true)
    expect(isOwner({ userId: 'user-2' }, resource)).toBe(false)
    expect(isOwner(null, resource)).toBe(false)
  })

  test('a missing resource is always denied, never treated as ownerless-and-allowed', () => {
    expect(isOwner({ userId: 'user-1' }, undefined)).toBe(false)
  })
})

describe('IP backstop', () => {
  test('normalizeIp coarsens to a /24 (IPv4) or /48-ish (IPv6) prefix', () => {
    expect(normalizeIp('203.0.113.42')).toBe('203.0.113.0/24')
    expect(normalizeIp('2001:db8:1234:5678::1')).toBe('2001:db8:1234')
  })

  test('hashIp never contains the raw address', () => {
    const hash = hashIp(SENTINEL_IP_SECRET, '203.0.113.42')
    expect(hash.includes('203.0.113.42')).toBe(false)
    expect(hash.includes(SENTINEL_IP_SECRET)).toBe(false)
  })

  test('the default ceiling is generous enough for a shared hackathon-venue network', () => {
    expect(DEFAULT_IP_BACKSTOP_MAX_ATTEMPTS).toBeGreaterThan(10)
    expect(DEFAULT_IP_BACKSTOP_WINDOW_MS).toBeGreaterThan(0)
  })

  test('permits attempts under the ceiling and denies once it is exceeded, within one window', () => {
    const backstop = new IpBackstop({ ipHashSecret: SENTINEL_IP_SECRET, windowMs: 60_000, maxAttemptsPerWindow: 3 })

    expect(backstop.attempt('203.0.113.1')).toBe(true)
    expect(backstop.attempt('203.0.113.1')).toBe(true)
    expect(backstop.attempt('203.0.113.1')).toBe(true)
    expect(backstop.attempt('203.0.113.1')).toBe(false)
  })

  test('two different /24 buckets are tracked independently', () => {
    const backstop = new IpBackstop({ ipHashSecret: SENTINEL_IP_SECRET, windowMs: 60_000, maxAttemptsPerWindow: 1 })

    expect(backstop.attempt('203.0.113.1')).toBe(true)
    expect(backstop.attempt('203.0.113.1')).toBe(false)
    expect(backstop.attempt('198.51.100.9')).toBe(true)
  })
})

describe('reserveAllowance', () => {
  const ceilings: AllowanceCeilings = { maxTotalTokens: 1000, maxRuns: 2 }

  test('reserves against a fresh user with no prior row', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    const result = reserveAllowance(db, user.id, 400, ceilings)
    expect(result.ok).toBe(true)
  })

  test('denies once the token ceiling would be exceeded by committed + reserved + this request', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    const first = reserveAllowance(db, user.id, 700, ceilings)
    expect(first.ok).toBe(true)

    const second = reserveAllowance(db, user.id, 400, ceilings)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.reason).toBe('shared_pool_exhausted')
  })

  test('denies once the run-count ceiling is reached, even with tokens to spare', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    expect(reserveAllowance(db, user.id, 10, ceilings).ok).toBe(true)
    expect(reserveAllowance(db, user.id, 10, ceilings).ok).toBe(true)
    const third = reserveAllowance(db, user.id, 10, ceilings)
    expect(third.ok).toBe(false)
  })

  test('release() frees the reservation so a later request can use that capacity', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    const first = reserveAllowance(db, user.id, 700, ceilings)
    expect(first.ok).toBe(true)
    if (first.ok) first.reservation.release()

    const second = reserveAllowance(db, user.id, 700, ceilings)
    expect(second.ok).toBe(true)
  })

  test('reconcile() commits the actual usage and permanently consumes the run slot', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    const first = reserveAllowance(db, user.id, 700, ceilings)
    expect(first.ok).toBe(true)
    if (first.ok) first.reservation.reconcile(50)

    const row = db
      .query(
        'SELECT tokens_used as tokensUsed, tokens_reserved as tokensReserved FROM user_allowance WHERE user_id = ?'
      )
      .get(user.id) as { tokensUsed: number; tokensReserved: number }
    expect(row.tokensUsed).toBe(50)
    expect(row.tokensReserved).toBe(0)
  })

  test('reconcile() and release() are each idempotent — a second call has no further effect', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')

    const first = reserveAllowance(db, user.id, 700, ceilings)
    if (first.ok) {
      first.reservation.reconcile(50)
      first.reservation.reconcile(9999) // second call must be a no-op
      first.reservation.release() // also a no-op after reconcile
    }

    const row = db.query('SELECT tokens_used as tokensUsed FROM user_allowance WHERE user_id = ?').get(user.id) as {
      tokensUsed: number
    }
    expect(row.tokensUsed).toBe(50)
  })

  test('counters survive restart: reopening the same on-disk ledger preserves prior reservations', () => {
    const path = `${process.env.TMPDIR ?? '/tmp'}/bmd-admission-test-${crypto.randomUUID()}.sqlite`
    const first = new Database(path)
    first.exec('PRAGMA foreign_keys = ON')
    migrateControlLedger(first)
    const user = createOrLinkUser(first, 'gh-restart')
    reserveAllowance(first, user.id, 300, ceilings)
    first.close()

    const reopened = new Database(path)
    reopened.exec('PRAGMA foreign_keys = ON')
    const row = reopened
      .query('SELECT tokens_reserved as tokensReserved FROM user_allowance WHERE user_id = ?')
      .get(user.id) as {
      tokensReserved: number
    }
    expect(row.tokensReserved).toBe(300)
    reopened.close()

    rmSync(path, { force: true })
    rmSync(`${path}-wal`, { force: true })
    rmSync(`${path}-shm`, { force: true })
  })

  test('teeth check: a ceiling that is not actually enforced would let this test pass — prove it is enforced by breaking it', () => {
    // Regression guard for the enforcement itself: an allowance that always says "ok" (as if the
    // ceiling check were deleted) would make every prior denial test in this suite fail — this
    // test exists to make that failure mode explicit and named, rather than relying on reviewer
    // memory of the earlier assertions.
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const zeroCeiling: AllowanceCeilings = { maxTotalTokens: 0, maxRuns: 0 }

    const result = reserveAllowance(db, user.id, 1, zeroCeiling)
    expect(result.ok).toBe(false)
  })
})

describe('admitGenerationRequest', () => {
  function deps(overrides: Partial<AdmissionDeps> = {}): AdmissionDeps {
    return {
      db: freshDb(),
      sessionConfig,
      ipBackstop: new IpBackstop({ ipHashSecret: SENTINEL_IP_SECRET, windowMs: 60_000, maxAttemptsPerWindow: 100 }),
      allowanceCeilings: { maxTotalTokens: 100_000, maxRuns: 10 },
      generationSemaphore: new GenerationSemaphore(1),
      runBudgetDefaults: { maxTotalTokens: 5000, maxWallMs: 60_000 },
      ...overrides
    }
  }

  test('denies with no session token at all — no downstream layer is ever reached', () => {
    const d = deps()
    const result = admitGenerationRequest(d, { sessionToken: undefined, clientIp: '203.0.113.1' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('unauthorized')
  })

  test('denies with a session token that does not verify', () => {
    const d = deps()
    const result = admitGenerationRequest(d, { sessionToken: 'forged-token', clientIp: '203.0.113.1' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('unauthorized')
  })

  test('an authenticated request is denied once the coarse IP backstop is exceeded, before any *additional* allowance is reserved', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const d = deps({
      db,
      ipBackstop: new IpBackstop({ ipHashSecret: SENTINEL_IP_SECRET, windowMs: 60_000, maxAttemptsPerWindow: 1 })
    })

    const first = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(first.ok).toBe(true) // consumes the one allowed attempt, and reserves once

    const result = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('capacity_busy')

    // The IP-backstop-denied second attempt must not have reserved anything of its own — only
    // the first (successful) attempt's reservation is present.
    const row = db.query('SELECT runs_reserved as runsReserved FROM user_allowance WHERE user_id = ?').get(user.id) as {
      runsReserved: number
    }
    expect(row.runsReserved).toBe(1)
  })

  test('a request denied purely by the IP backstop with zero prior attempts never reserves an allowance at all', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const d = deps({
      db,
      ipBackstop: new IpBackstop({ ipHashSecret: SENTINEL_IP_SECRET, windowMs: 60_000, maxAttemptsPerWindow: 0 })
    })

    const result = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('capacity_busy')

    const allowanceRow = db.query('SELECT COUNT(*) as count FROM user_allowance WHERE user_id = ?').get(user.id) as {
      count: number
    }
    expect(allowanceRow.count).toBe(0)
  })

  test('denies with shared_pool_exhausted once the per-user allowance ceiling is reached, before the global semaphore is touched', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const d = deps({
      db,
      allowanceCeilings: { maxTotalTokens: 100_000, maxRuns: 1 },
      generationSemaphore: new GenerationSemaphore(5)
    })

    const first = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(first.ok).toBe(true)

    const second = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('shared_pool_exhausted')

    // The semaphore capacity (5) was never exhausted — only one slot was actually acquired.
    expect(d.generationSemaphore.available).toBe(4)
  })

  test('when the global semaphore denies, the allowance reservation from this same attempt is released, not leaked', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const d = deps({ db, generationSemaphore: new GenerationSemaphore(1) })

    const first = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(first.ok).toBe(true) // takes the one semaphore slot

    const second = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('capacity_busy')

    // The denied second attempt's allowance reservation must have been released, not left committed.
    const row = db
      .query(
        'SELECT tokens_reserved as tokensReserved, runs_reserved as runsReserved FROM user_allowance WHERE user_id = ?'
      )
      .get(user.id) as { tokensReserved: number; runsReserved: number }
    expect(row.runsReserved).toBe(1) // only the first (successful) attempt's reservation remains
  })

  test('a successful admission returns a context whose settle() reconciles usage and frees the semaphore', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const semaphore = new GenerationSemaphore(1)
    const d = deps({ db, generationSemaphore: semaphore })

    const result = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(semaphore.available).toBe(0)
    result.context.settle({ totalTokens: 123 })
    expect(semaphore.available).toBe(1)

    const row = db
      .query('SELECT tokens_used as tokensUsed, runs_used as runsUsed FROM user_allowance WHERE user_id = ?')
      .get(user.id) as {
      tokensUsed: number
      runsUsed: number
    }
    expect(row.tokensUsed).toBe(123)
    expect(row.runsUsed).toBe(1)
  })

  test('settle() is idempotent — calling it twice never double-releases the semaphore or double-commits usage', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const semaphore = new GenerationSemaphore(1)
    const d = deps({ db, generationSemaphore: semaphore })

    const result = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    result.context.settle({ totalTokens: 50 })
    result.context.settle({ totalTokens: 999 })

    expect(semaphore.available).toBe(1)
    const row = db.query('SELECT tokens_used as tokensUsed FROM user_allowance WHERE user_id = ?').get(user.id) as {
      tokensUsed: number
    }
    expect(row.tokensUsed).toBe(50)
  })

  test('an aborted run (settle with no usage) releases the allowance reservation entirely, counting neither tokens nor a run', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const d = deps({ db })

    const result = admitGenerationRequest(d, { sessionToken: session.token, clientIp: '203.0.113.1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    result.context.settle()

    const row = db
      .query(
        'SELECT tokens_used as tokensUsed, runs_used as runsUsed, tokens_reserved as tokensReserved FROM user_allowance WHERE user_id = ?'
      )
      .get(user.id) as { tokensUsed: number; runsUsed: number; tokensReserved: number }
    expect(row.tokensUsed).toBe(0)
    expect(row.runsUsed).toBe(0)
    expect(row.tokensReserved).toBe(0)
  })

  test('a client-requested lower run limit narrows the reservation; the server ceiling is never a client input', () => {
    const db = freshDb()
    const user = createOrLinkUser(db, 'gh-1')
    const session = createSession(db, user.id, sessionConfig)
    const d = deps({ db, runBudgetDefaults: { maxTotalTokens: 5000, maxWallMs: 60_000 } })

    const result = admitGenerationRequest(d, {
      sessionToken: session.token,
      clientIp: '203.0.113.1',
      requestedLimits: { maxTotalTokens: 999_999 } // attempts to raise the ceiling
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.context.runLimits.maxTotalTokens).toBe(5000) // clamped, never raised
  })
})
