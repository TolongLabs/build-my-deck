import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { buildGithubAuthorizeUrl, completeGithubLogin } from '../src/auth/github'
import { sanitizeReturnTo } from '../src/auth/return-to'
import { createAuthRoutes } from '../src/auth/routes'
import { OAuthStateStore } from '../src/auth/state'
import { migrateControlLedger } from '../src/control-ledger/schema'
import { assertNoSecretLeak } from '../src/secrets'

const SENTINEL_CLIENT_ID = 'sentinel-github-client-id'
const SENTINEL_CLIENT_SECRET = 'sentinel-github-client-secret'
const SENTINEL_SESSION_SECRET = 'sentinel-session-secret'
const SENTINEL_ACCESS_TOKEN = 'sentinel-github-access-token'

function freshDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrateControlLedger(db)
  return db
}

describe('buildGithubAuthorizeUrl', () => {
  test('carries the client id and state, and requests no scope beyond the default public profile', () => {
    const url = new URL(buildGithubAuthorizeUrl(SENTINEL_CLIENT_ID, 'the-state-value'))

    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe(SENTINEL_CLIENT_ID)
    expect(url.searchParams.get('state')).toBe('the-state-value')
    expect(url.searchParams.get('scope')).toBeNull()
    expect(url.searchParams.get('redirect_uri')).toBeNull()
  })
})

describe('sanitizeReturnTo — open-redirect allowlist', () => {
  test('accepts a same-origin relative path', () => {
    expect(sanitizeReturnTo('/editor/deck-1')).toBe('/editor/deck-1')
    expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard')
    expect(sanitizeReturnTo('/d?x=1#y')).toBe('/d?x=1#y')
  })

  test('rejects a path that normalizes to a protocol-relative URL', () => {
    expect(sanitizeReturnTo('/..//evil.example')).toBe('/')
  })

  test('rejects a nested path that normalizes to a protocol-relative URL', () => {
    expect(sanitizeReturnTo('/a/../..//evil.example')).toBe('/')
  })

  test('rejects percent-encoded dot segments that normalize to a protocol-relative URL', () => {
    expect(sanitizeReturnTo('/%2e%2e//evil.example')).toBe('/')
  })

  test('rejects a backslash path that normalizes to a protocol-relative URL', () => {
    expect(sanitizeReturnTo('/..\\evil.example')).toBe('/')
  })

  test('falls back to / for a missing value', () => {
    expect(sanitizeReturnTo(undefined)).toBe('/')
    expect(sanitizeReturnTo(null)).toBe('/')
    expect(sanitizeReturnTo('')).toBe('/')
  })

  test('rejects an absolute URL to another host', () => {
    expect(sanitizeReturnTo('https://evil.example/phish')).toBe('/')
  })

  test('rejects a protocol-relative URL (the classic open-redirect bypass)', () => {
    expect(sanitizeReturnTo('//evil.example/phish')).toBe('/')
  })

  test('rejects slash and backslash authority forms', () => {
    expect(sanitizeReturnTo('/\\evil.example/phish')).toBe('/')
    expect(sanitizeReturnTo('\\/evil.example/phish')).toBe('/')
    expect(sanitizeReturnTo('\\\\evil.example/phish')).toBe('/')
  })

  test('rejects tab and newline characters inside a protocol-relative authority', () => {
    expect(sanitizeReturnTo('//evil\t.example/phish')).toBe('/')
    expect(sanitizeReturnTo('//evil\n.example/phish')).toBe('/')
  })

  test('keeps percent-encoded separator characters in the same-origin path', () => {
    expect(sanitizeReturnTo('/%2f%2fevil.example/phish')).toBe('/%2f%2fevil.example/phish')
    expect(sanitizeReturnTo('/%5cevil.example/phish')).toBe('/%5cevil.example/phish')
  })

  test('rejects a path that embeds a scheme anywhere in it', () => {
    expect(sanitizeReturnTo('/redirect?next=https://evil.example')).toBe('/')
  })

  test('rejects a bare host with no leading slash', () => {
    expect(sanitizeReturnTo('evil.example')).toBe('/')
  })
})

describe('OAuthStateStore', () => {
  test('a freshly issued state consumes exactly once', () => {
    const store = new OAuthStateStore()
    const state = store.issue('/return/here')

    const first = store.consume(state)
    expect(first).toEqual({ ok: true, returnTo: '/return/here' })

    const second = store.consume(state)
    expect(second).toEqual({ ok: false })
  })

  test('a forged state (never issued) is rejected', () => {
    const store = new OAuthStateStore()
    expect(store.consume('never-issued-state')).toEqual({ ok: false })
  })

  test('a replayed state — consumed once already — is rejected on the second attempt, closing the CSRF window', () => {
    const store = new OAuthStateStore()
    const state = store.issue('/x')
    store.consume(state)

    expect(store.consume(state).ok).toBe(false)
  })
})

describe('completeGithubLogin', () => {
  function fakeFetch(responses: {
    token?: unknown
    user?: unknown
    tokenOk?: boolean
    userOk?: boolean
  }): typeof fetch {
    let call = 0
    return (async (_url: string, _init?: RequestInit) => {
      call += 1
      if (call === 1) {
        return new Response(JSON.stringify(responses.token ?? { access_token: SENTINEL_ACCESS_TOKEN }), {
          status: responses.tokenOk === false ? 400 : 200
        })
      }
      return new Response(JSON.stringify(responses.user ?? { id: 4242 }), {
        status: responses.userOk === false ? 401 : 200
      })
    }) as typeof fetch
  }

  test('exchanges the code and returns the stable numeric subject as a string', async () => {
    const identity = await completeGithubLogin(
      { clientId: SENTINEL_CLIENT_ID, clientSecret: SENTINEL_CLIENT_SECRET },
      'the-code',
      fakeFetch({})
    )
    expect(identity.githubSubject).toBe('4242')
  })

  test('throws if the token exchange itself fails', async () => {
    await expect(
      completeGithubLogin(
        { clientId: SENTINEL_CLIENT_ID, clientSecret: SENTINEL_CLIENT_SECRET },
        'bad-code',
        fakeFetch({ tokenOk: false })
      )
    ).rejects.toThrow()
  })

  test('throws if GitHub returns no access_token', async () => {
    await expect(
      completeGithubLogin(
        { clientId: SENTINEL_CLIENT_ID, clientSecret: SENTINEL_CLIENT_SECRET },
        'the-code',
        fakeFetch({ token: { error: 'bad_verification_code' } })
      )
    ).rejects.toThrow()
  })

  test('throws if the user lookup fails', async () => {
    await expect(
      completeGithubLogin(
        { clientId: SENTINEL_CLIENT_ID, clientSecret: SENTINEL_CLIENT_SECRET },
        'the-code',
        fakeFetch({ userOk: false })
      )
    ).rejects.toThrow()
  })

  test('throws if the user lookup returns no numeric id', async () => {
    await expect(
      completeGithubLogin(
        { clientId: SENTINEL_CLIENT_ID, clientSecret: SENTINEL_CLIENT_SECRET },
        'the-code',
        fakeFetch({ user: { login: 'octocat' } })
      )
    ).rejects.toThrow()
  })

  test('the client secret and the access token never appear in the identity result', async () => {
    const identity = await completeGithubLogin(
      { clientId: SENTINEL_CLIENT_ID, clientSecret: SENTINEL_CLIENT_SECRET },
      'the-code',
      fakeFetch({})
    )
    assertNoSecretLeak(JSON.stringify(identity), [SENTINEL_CLIENT_SECRET, SENTINEL_ACCESS_TOKEN])
  })
})

describe('createAuthRoutes', () => {
  const env = {
    GITHUB_OAUTH_CLIENT_ID: SENTINEL_CLIENT_ID,
    GITHUB_OAUTH_CLIENT_SECRET: SENTINEL_CLIENT_SECRET,
    SESSION_SECRET: SENTINEL_SESSION_SECRET
  }

  test('GET /github redirects to GitHub with a freshly issued, single-use state', async () => {
    const stateStore = new OAuthStateStore()
    const app = createAuthRoutes({
      db: freshDb(),
      env,
      sessionTtl: { idleTtlMs: 60_000, absoluteTtlMs: 60_000 },
      stateStore
    })

    const response = await app.request('/github', { redirect: 'manual' })
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location') ?? '')
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(location.searchParams.get('state')).not.toBeNull()
  })

  test('GET /github/callback rejects a forged state before ever calling GitHub', async () => {
    const app = createAuthRoutes({ db: freshDb(), env, sessionTtl: { idleTtlMs: 60_000, absoluteTtlMs: 60_000 } })

    const response = await app.request('/github/callback?state=never-issued&code=whatever')
    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('unauthorized')
  })

  test('GET /github/callback rejects a replayed state on its second use', async () => {
    const stateStore = new OAuthStateStore()
    const state = stateStore.issue('/')
    const app = createAuthRoutes({
      db: freshDb(),
      env,
      sessionTtl: { idleTtlMs: 60_000, absoluteTtlMs: 60_000 },
      stateStore
    })

    // First use fails at the network call (no live GitHub in tests) but still consumes the state.
    await app.request(`/github/callback?state=${state}&code=some-code`)
    const replay = await app.request(`/github/callback?state=${state}&code=some-code`)

    expect(replay.status).toBe(401)
  })

  test('GET /github/callback rejects an open-redirect return_to at issue time, not at callback time', async () => {
    const stateStore = new OAuthStateStore()
    const app = createAuthRoutes({
      db: freshDb(),
      env,
      sessionTtl: { idleTtlMs: 60_000, absoluteTtlMs: 60_000 },
      stateStore
    })

    const response = await app.request('/github?return_to=https://evil.example/phish', { redirect: 'manual' })
    const location = new URL(response.headers.get('location') ?? '')
    const state = location.searchParams.get('state') as string

    const consumed = stateStore.consume(state)
    expect(consumed).toEqual({ ok: true, returnTo: '/' })
  })

  test('a successful callback links the user, creates a session cookie, and redirects to the sanitized return_to', async () => {
    const db = freshDb()
    const stateStore = new OAuthStateStore()
    const app = createAuthRoutes({
      db,
      env,
      sessionTtl: { idleTtlMs: 60_000, absoluteTtlMs: 60_000 },
      stateStore
    })

    const state = stateStore.issue('/editor/deck-1')
    const originalFetch = globalThis.fetch
    let call = 0
    globalThis.fetch = (async () => {
      call += 1
      if (call === 1) return new Response(JSON.stringify({ access_token: SENTINEL_ACCESS_TOKEN }), { status: 200 })
      return new Response(JSON.stringify({ id: 99887766 }), { status: 200 })
    }) as unknown as typeof fetch

    let response: Response
    try {
      response = await app.request(`/github/callback?state=${state}&code=real-code`, { redirect: 'manual' })
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/editor/deck-1')
    expect(response.headers.get('set-cookie')).toContain('bmd_session=')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('Secure')

    const user = db.query('SELECT id FROM users WHERE github_subject = ?').get('99887766') as { id: string } | null
    expect(user).not.toBeNull()
    assertNoSecretLeak(response.headers.get('set-cookie') ?? '', [SENTINEL_CLIENT_SECRET, SENTINEL_ACCESS_TOKEN])
  })

  test('POST /signout always clears the session cookie, even with no session present', async () => {
    const app = createAuthRoutes({ db: freshDb(), env, sessionTtl: { idleTtlMs: 60_000, absoluteTtlMs: 60_000 } })

    const response = await app.request('/signout', { method: 'POST' })
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('bmd_session=;')
  })
})
