import { describe, expect, test } from 'bun:test'
import { createGeminiAdapterFromEnv } from '../src/adapters/gemini'
import { createQwenAdapterFromEnv } from '../src/adapters/openai-compatible'
import { envCredentialResolver, requireEnvValue, staticCredentialResolver } from '../src/credentials'

describe('CredentialResolver', () => {
  test('is a swappable async function — a fixture resolver satisfies the same type as any other', async () => {
    const resolve = staticCredentialResolver('sentinel-value')
    expect(await resolve()).toBe('sentinel-value')
  })

  test('resolving twice returns the same value without caching a shared mutable reference', async () => {
    const resolve = staticCredentialResolver('sentinel-value')
    const [first, second] = await Promise.all([resolve(), resolve()])
    expect(first).toBe('sentinel-value')
    expect(second).toBe('sentinel-value')
  })
})

describe('envCredentialResolver / requireEnvValue', () => {
  test('reads the named variable at call time and rejects when unset', async () => {
    const resolve = envCredentialResolver({ SENTINEL_KEY: 'sentinel-value' }, 'SENTINEL_KEY')
    expect(await resolve()).toBe('sentinel-value')
    await expect(envCredentialResolver({}, 'MISSING')()).rejects.toThrow('Missing required credential: MISSING')
  })

  test('requireEnvValue returns the configured value or throws when unset', () => {
    expect(requireEnvValue({ SENTINEL_URL: 'https://sentinel.invalid' }, 'SENTINEL_URL')).toBe(
      'https://sentinel.invalid'
    )
    expect(() => requireEnvValue({}, 'MISSING')).toThrow()
  })
})

describe('vendor names are confined to the *FromEnv adapter constructors', () => {
  test('createQwenAdapterFromEnv requires QWEN_BASE_URL up front, DASHSCOPE_API_KEY lazily', () => {
    expect(() => createQwenAdapterFromEnv({})).toThrow()
    expect(() => createQwenAdapterFromEnv({ DASHSCOPE_API_KEY: 'sentinel-dashscope-key' })).toThrow()

    const adapter = createQwenAdapterFromEnv({
      DASHSCOPE_API_KEY: 'sentinel-dashscope-key',
      QWEN_BASE_URL: 'https://sentinel.invalid/v1'
    })
    expect(adapter.descriptor.id).toBe('qwen')
  })

  test('createGeminiAdapterFromEnv resolves GEMINI_API_KEY lazily, on the first call', () => {
    expect(() => createGeminiAdapterFromEnv({})).not.toThrow()
    const adapter = createGeminiAdapterFromEnv({ GEMINI_API_KEY: 'sentinel-gemini-key' })
    expect(adapter.descriptor.id).toBe('gemini')
  })
})
