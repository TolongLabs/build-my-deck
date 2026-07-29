import type { Database } from 'bun:sqlite'

export interface AllowanceCeilings {
  maxTotalTokens: number
  maxRuns: number
}

export interface AllowanceReservation {
  /** Commits the reservation as one completed run with its actual token usage. Idempotent. */
  reconcile(actualTotalTokens: number): void
  /** Abandons the reservation without counting a run — used when a later admission layer denies. Idempotent. */
  release(): void
}

export type AllowanceReserveResult =
  | { ok: true; reservation: AllowanceReservation }
  | { ok: false; reason: 'shared_pool_exhausted' }

interface AllowanceRow {
  tokensUsed: number
  tokensReserved: number
  runsUsed: number
  runsReserved: number
}

function readAllowanceRow(db: Database, userId: string): AllowanceRow {
  db.query('INSERT OR IGNORE INTO user_allowance (user_id) VALUES (?)').run(userId)
  return db
    .query(
      'SELECT tokens_used as tokensUsed, tokens_reserved as tokensReserved, runs_used as runsUsed, runs_reserved as runsReserved FROM user_allowance WHERE user_id = ?'
    )
    .get(userId) as AllowanceRow
}

/**
 * Atomically reserves capacity for one run against a user's finite allowance. `db.transaction`
 * runs the whole read-check-write synchronously and without an `await` in between, so two
 * requests arriving back-to-back can never both observe capacity only one of them actually has.
 */
export function reserveAllowance(
  db: Database,
  userId: string,
  estimatedTotalTokens: number,
  ceilings: AllowanceCeilings
): AllowanceReserveResult {
  const attempt = db.transaction((id: string) => {
    const row = readAllowanceRow(db, id)
    const committedTokens = row.tokensUsed + row.tokensReserved
    const committedRuns = row.runsUsed + row.runsReserved

    if (committedRuns + 1 > ceilings.maxRuns || committedTokens + estimatedTotalTokens > ceilings.maxTotalTokens) {
      return { ok: false as const, reason: 'shared_pool_exhausted' as const }
    }

    db.query(
      'UPDATE user_allowance SET tokens_reserved = tokens_reserved + ?, runs_reserved = runs_reserved + 1 WHERE user_id = ?'
    ).run(estimatedTotalTokens, id)
    return { ok: true as const }
  })(userId)

  if (!attempt.ok) return attempt

  let settled = false

  const releaseReservation = db.transaction((id: string) => {
    db.query(
      'UPDATE user_allowance SET tokens_reserved = tokens_reserved - ?, runs_reserved = runs_reserved - 1 WHERE user_id = ?'
    ).run(estimatedTotalTokens, id)
  })

  const commitReservation = db.transaction((id: string, actualTotalTokens: number) => {
    db.query(
      'UPDATE user_allowance SET tokens_reserved = tokens_reserved - ?, runs_reserved = runs_reserved - 1, tokens_used = tokens_used + ?, runs_used = runs_used + 1 WHERE user_id = ?'
    ).run(estimatedTotalTokens, actualTotalTokens, id)
  })

  return {
    ok: true,
    reservation: {
      reconcile(actualTotalTokens) {
        if (settled) return
        settled = true
        commitReservation(userId, actualTotalTokens)
      },
      release() {
        if (settled) return
        settled = true
        releaseReservation(userId)
      }
    }
  }
}
