import type { Database } from 'bun:sqlite'
import type { MiddlewareHandler } from 'hono'
import type { EnvSecrets } from '../secrets'
import { requireSecret } from '../secrets'
import { readSessionCookie } from '../sessions/cookies'
import { verifySession } from '../sessions/store'
import type { SessionTtlConfig } from '../sessions/store'
import './hono-context'

/**
 * Resolves the caller's session (if any) from the cookie and exposes it as `c.get('session')`.
 * The session secret is resolved lazily, per request, exactly like every other secret in this
 * service — so a deployment missing `SESSION_SECRET` fails only the routes that actually need
 * identity (this middleware is mounted on those routes only, never globally), not `/api/health`
 * or static asset serving.
 */
export function sessionMiddleware(db: Database, env: EnvSecrets, ttl: SessionTtlConfig): MiddlewareHandler {
  return async (c, next) => {
    const token = readSessionCookie(c)
    if (!token) {
      c.set('session', null)
      await next()
      return
    }

    let sessionSecret: string
    try {
      sessionSecret = await requireSecret(env, 'SESSION_SECRET')()
    } catch {
      c.set('session', null)
      await next()
      return
    }

    c.set('session', verifySession(db, token, { sessionSecret, ...ttl }))
    await next()
  }
}
