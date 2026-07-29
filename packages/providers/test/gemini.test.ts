import { afterEach, describe, expect, test } from 'bun:test'
import { createGeminiAdapter } from '../src/adapters/gemini'
import { staticCredentialResolver } from '../src/credentials'
import { ProviderError } from '../src/errors'

const originalFetch = globalThis.fetch

describe('Gemini adapter', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('sends the credential only via the x-goog-api-key header, never in the body or URL', async () => {
    const sentinelKey = 'sentinel-gemini-key'
    let capturedHeader: string | undefined
    let capturedUrl = ''
    let capturedBody = ''

    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedHeader = (init?.headers as Record<string, string>)['x-goog-api-key']
      capturedBody = String(init?.body ?? '')
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"headline":"ok","bulletCount":2}' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 6 }
        }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    const adapter = createGeminiAdapter({ resolveApiKey: staticCredentialResolver(sentinelKey) })
    const result = await adapter.complete(
      { modelId: 'gemini-flash-latest', messages: [{ role: 'user', content: 'hi' }], maxOutputTokens: 50 },
      new AbortController().signal
    )

    expect(result.text).toBe('{"headline":"ok","bulletCount":2}')
    expect(result.usage).toEqual({ inputTokens: 4, outputTokens: 6 })
    expect(capturedHeader).toBe(sentinelKey)
    expect(capturedUrl.includes(sentinelKey)).toBe(false)
    expect(capturedBody.includes(sentinelKey)).toBe(false)
  })

  test('normalizes a safety-triggered finish reason to a refusal', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }), {
        status: 200
      })) as unknown as typeof fetch

    const adapter = createGeminiAdapter({ resolveApiKey: staticCredentialResolver('sentinel') })

    try {
      await adapter.complete(
        { modelId: 'gemini-flash-latest', messages: [{ role: 'user', content: 'hi' }], maxOutputTokens: 50 },
        new AbortController().signal
      )
      throw new Error('expected complete() to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).kind).toBe('refusal')
    }
  })

  test('normalizes a 429 with no distinguishing body to a plain rate limit', async () => {
    globalThis.fetch = (async () => new Response('slow down', { status: 429 })) as unknown as typeof fetch
    const adapter = createGeminiAdapter({ resolveApiKey: staticCredentialResolver('sentinel') })

    try {
      await adapter.complete(
        { modelId: 'gemini-flash-latest', messages: [{ role: 'user', content: 'hi' }], maxOutputTokens: 50 },
        new AbortController().signal
      )
      throw new Error('expected complete() to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).kind).toBe('rate_limit')
    }
  })

  test('normalizes a 429 RESOURCE_EXHAUSTED body to quota_exhausted, not rate_limit', async () => {
    // Reproduces the real DashScope/Gemini free-tier response: same HTTP status as a
    // transient rate limit, but a daily quota exhaustion must not be retried the same way.
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota exceeded' } }), {
        status: 429
      })) as unknown as typeof fetch
    const adapter = createGeminiAdapter({ resolveApiKey: staticCredentialResolver('sentinel') })

    try {
      await adapter.complete(
        { modelId: 'gemini-flash-latest', messages: [{ role: 'user', content: 'hi' }], maxOutputTokens: 50 },
        new AbortController().signal
      )
      throw new Error('expected complete() to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).kind).toBe('quota_exhausted')
    }
  })
})
