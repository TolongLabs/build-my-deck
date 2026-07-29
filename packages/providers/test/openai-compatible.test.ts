import { afterEach, describe, expect, test } from 'bun:test'
import type { ProviderAdapter } from '../src/adapter'
import { createOpenAiCompatibleAdapter } from '../src/adapters/openai-compatible'
import { staticCredentialResolver } from '../src/credentials'
import { ProviderError, type ProviderErrorKind } from '../src/errors'

const originalFetch = globalThis.fetch

function testAdapter(): ProviderAdapter {
  return createOpenAiCompatibleAdapter({
    providerId: 'test-openai-compatible',
    providerName: 'Test',
    baseUrl: 'https://example.invalid/v1',
    resolveApiKey: staticCredentialResolver('sentinel'),
    models: [
      {
        id: 'test-model',
        capabilities: {
          inputModalities: ['text'],
          contextWindowTokens: 1000,
          maxOutputTokens: 100,
          structuredOutputTier: 'json_mode',
          imageGeneration: false,
          streaming: false
        }
      }
    ]
  })
}

async function expectProviderErrorKind(adapter: ProviderAdapter, kind: ProviderErrorKind): Promise<void> {
  try {
    await adapter.complete(
      { modelId: 'test-model', messages: [{ role: 'user', content: 'hi' }], maxOutputTokens: 50 },
      new AbortController().signal
    )
    throw new Error('expected complete() to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError)
    expect((error as ProviderError).kind).toBe(kind)
  }
}

describe('OpenAI-compatible adapter', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('never sends the resolved credential anywhere but the Authorization header', async () => {
    const sentinelKey = 'sentinel-openai-compatible-key'
    let capturedAuthHeader: string | undefined
    let capturedBody = ''

    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      capturedAuthHeader = (init?.headers as Record<string, string>).authorization
      capturedBody = String(init?.body ?? '')
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"headline":"ok","bulletCount":1}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 5 }
        }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    const adapter = createOpenAiCompatibleAdapter({
      providerId: 'test-openai-compatible',
      providerName: 'Test',
      baseUrl: 'https://example.invalid/v1',
      resolveApiKey: staticCredentialResolver(sentinelKey),
      models: [
        {
          id: 'test-model',
          capabilities: {
            inputModalities: ['text'],
            contextWindowTokens: 1000,
            maxOutputTokens: 100,
            structuredOutputTier: 'json_mode',
            imageGeneration: false,
            streaming: false
          }
        }
      ]
    })

    const result = await adapter.complete(
      { modelId: 'test-model', messages: [{ role: 'user', content: 'hi' }], maxOutputTokens: 50 },
      new AbortController().signal
    )

    expect(result.text).toBe('{"headline":"ok","bulletCount":1}')
    expect(capturedAuthHeader).toBe(`Bearer ${sentinelKey}`)
    expect(capturedBody.includes(sentinelKey)).toBe(false)
  })

  test('normalizes an unauthorized response to an auth ProviderError, without leaking the body', async () => {
    globalThis.fetch = (async () => new Response('unauthorized', { status: 401 })) as unknown as typeof fetch
    await expectProviderErrorKind(testAdapter(), 'auth')
  })

  test('normalizes an OpenAI-standard insufficient_quota 429 to quota_exhausted, not rate_limit', async () => {
    // The one distinction that matters most for this adapter: DashScope/Qwen is the
    // provider the shared pool actually spends against.
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'You exceeded your quota', type: 'insufficient_quota' } }), {
        status: 429
      })) as unknown as typeof fetch
    await expectProviderErrorKind(testAdapter(), 'quota_exhausted')
  })

  test('normalizes an OpenAI-standard rate_limit_exceeded 429 to rate_limit', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'Rate limit reached', type: 'rate_limit_exceeded' } }), {
        status: 429
      })) as unknown as typeof fetch
    await expectProviderErrorKind(testAdapter(), 'rate_limit')
  })

  test('normalizes a vendor-specific quota/billing message without a recognized type to quota_exhausted', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'Insufficient account balance', code: 'Arrearage.Detected' } }), {
        status: 429
      })) as unknown as typeof fetch
    await expectProviderErrorKind(testAdapter(), 'quota_exhausted')
  })

  test('treats a 429 with a Retry-After header as a transient rate limit when no quota vocabulary matched', async () => {
    globalThis.fetch = (async () =>
      new Response('{}', { status: 429, headers: { 'retry-after': '2' } })) as unknown as typeof fetch
    await expectProviderErrorKind(testAdapter(), 'rate_limit')
  })

  test('defaults an unrecognized 429 (no body, no Retry-After) to quota_exhausted — the safer failure mode for a shared pool', async () => {
    globalThis.fetch = (async () => new Response('', { status: 429 })) as unknown as typeof fetch
    await expectProviderErrorKind(testAdapter(), 'quota_exhausted')
  })

  test('rejects an unknown model before any network call', async () => {
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const adapter = createOpenAiCompatibleAdapter({
      providerId: 'test-openai-compatible',
      providerName: 'Test',
      baseUrl: 'https://example.invalid/v1',
      resolveApiKey: staticCredentialResolver('sentinel'),
      models: []
    })

    await expect(
      adapter.complete({ modelId: 'missing-model', messages: [], maxOutputTokens: 1 }, new AbortController().signal)
    ).rejects.toThrow()
    expect(called).toBe(false)
  })
})
