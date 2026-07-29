import { describe, expect, test } from 'bun:test'
import { assertNoSecretLeak, requireSecret } from '../src/secrets'

const SENTINEL_VALUE = 'sentinel-secret-value'

describe('secrets', () => {
  test('requireSecret resolves a present value and never eagerly reads it', async () => {
    let reads = 0
    const env = {
      get X() {
        reads += 1
        return SENTINEL_VALUE
      }
    } as unknown as Record<string, string | undefined>

    const resolve = requireSecret(env, 'X')
    expect(reads).toBe(0)
    expect(await resolve()).toBe(SENTINEL_VALUE)
    expect(reads).toBe(1)
  })

  test('requireSecret rejects when the named variable is unset or empty', async () => {
    await expect(requireSecret({}, 'MISSING')()).rejects.toThrow('Missing required secret: MISSING')
    await expect(requireSecret({ EMPTY: '' }, 'EMPTY')()).rejects.toThrow()
  })

  test('assertNoSecretLeak passes when a sentinel is absent and throws when present', () => {
    expect(() => assertNoSecretLeak('nothing sensitive here', [SENTINEL_VALUE])).not.toThrow()
    expect(() => assertNoSecretLeak(`oops: ${SENTINEL_VALUE}`, [SENTINEL_VALUE])).toThrow()
  })

  test('assertNoSecretLeak ignores undefined/empty secret entries', () => {
    expect(() => assertNoSecretLeak('anything', [undefined, ''])).not.toThrow()
  })
})
