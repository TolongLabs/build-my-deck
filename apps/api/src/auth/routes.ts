import type { Database } from 'bun:sqlite'
import { Hono } from 'hono'
import { HttpError } from '../http-errors'
import { createOrLinkUser } from '../identity/users'
import type { EnvSecrets } from '../secrets'
import { requireSecret } from '../secrets'
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../sessions/cookies'
import { createSession, deleteSession } from '../sessions/store'
import type { SessionTtlConfig } from '../sessions/store'
import { buildGithubAuthorizeUrl, completeGithubLogin } from './github'
import { sanitizeReturnTo } from './return-to'
import { OAuthStateStore } from './state'

export interface AuthRoutesDeps {
  db: Database
  env: EnvSecrets
  sessionTtl: SessionTtlConfig
  /** Injectable for tests; production leaves this to the default single in-memory store. */
  stateStore?: OAuthStateStore
}

/** Never leaks *why* sign-in failed beyond a fixed, generic message — see `docs/plan.md`'s no-secret-in-error-message constraint. */
function signInFailed(): Response {
  const error = new HttpError(401, 'unauthorized', 'Sign-in failed')
  return Response.json(error.toResponseBody(), { status: error.status })
}

export function createAuthRoutes(deps: AuthRoutesDeps): Hono {
  const app = new Hono()
  const stateStore = deps.stateStore ?? new OAuthStateStore()

  app.get('/github', async (c) => {
    let clientId: string
    try {
      clientId = await requireSecret(deps.env, 'GITHUB_OAUTH_CLIENT_ID')()
    } catch {
      return signInFailed()
    }

    const returnTo = sanitizeReturnTo(c.req.query('return_to'))
    const state = stateStore.issue(returnTo)
    return c.redirect(buildGithubAuthorizeUrl(clientId, state))
  })

  app.get('/github/callback', async (c) => {
    const stateParam = c.req.query('state')
    const code = c.req.query('code')

    // Consumed unconditionally, on first sight, so a forged or replayed state can never be reused.
    const consumed = stateParam ? stateStore.consume(stateParam) : ({ ok: false } as const)
    if (!consumed.ok || !code) return signInFailed()

    let clientId: string
    let clientSecret: string
    let sessionSecret: string
    try {
      clientId = await requireSecret(deps.env, 'GITHUB_OAUTH_CLIENT_ID')()
      clientSecret = await requireSecret(deps.env, 'GITHUB_OAUTH_CLIENT_SECRET')()
      sessionSecret = await requireSecret(deps.env, 'SESSION_SECRET')()
    } catch {
      return signInFailed()
    }

    let identity: { githubSubject: string }
    try {
      identity = await completeGithubLogin({ clientId, clientSecret }, code)
    } catch {
      return signInFailed()
    }

    const user = createOrLinkUser(deps.db, identity.githubSubject)
    const session = createSession(deps.db, user.id, { sessionSecret, ...deps.sessionTtl })
    setSessionCookie(c, session.token, session.absoluteExpiresAt)

    return c.redirect(consumed.returnTo)
  })

  app.post('/signout', async (c) => {
    const token = readSessionCookie(c)
    if (token) {
      try {
        const sessionSecret = await requireSecret(deps.env, 'SESSION_SECRET')()
        deleteSession(deps.db, token, { sessionSecret })
      } catch {
        // Missing session secret at sign-out time still clears the cookie below — sign-out fails safe.
      }
    }
    clearSessionCookie(c)
    return c.json({ signedOut: true })
  })

  return app
}
