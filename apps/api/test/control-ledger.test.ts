import { describe, expect, test } from 'bun:test'
import { openControlLedger } from '../src/control-ledger/db'

describe('openControlLedger', () => {
  test('enables foreign-key enforcement on every opened connection', () => {
    const db = openControlLedger(':memory:')

    const pragma = db.query('PRAGMA foreign_keys').get() as { foreign_keys: number }
    expect(pragma.foreign_keys).toBe(1)

    db.close()
  })
})
