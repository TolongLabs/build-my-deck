import type { Database } from 'bun:sqlite'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { requireSameOrigin } from './admission/csrf'
import { sessionMiddleware } from './admission/session-middleware'
import { createAuthRoutes } from './auth/routes'
import type { ApiConfig } from './config'
import { controlLedgerPath, openControlLedger } from './control-ledger/db'
import { requestSizeLimit } from './request-limits'
import { mountApiRoutes } from './routes'
import { DEFAULT_SESSION_TTL } from './sessions/store'

export interface CreateAppOptions {
  /** Directory of the built Vite bundle. Defaults relative to this file's own location. */
  staticDir?: string
  /** Test/diagnostic injection point for the identity/control ledger; defaults to `${config.dataDir}/control.sqlite`. */
  controlLedgerDb?: Database
  /** Test injection point; defaults to `process.env`. */
  env?: Record<string, string | undefined>
}

/**
 * The one Hono service: health, GitHub OAuth/session/account identity routes, the built web
 * bundle, and every route mounted by task 1's (unedited) route index. Request bodies are
 * bounded before any paid content is parsed. Session resolution and CSRF hardening are
 * mounted only on the routes that actually need identity — `/api/health` and static assets
 * never depend on `SESSION_SECRET` being configured.
 */
export function createApp(config: ApiConfig, options: CreateAppOptions = {}): Hono {
  const app = new Hono()
  const staticDir = options.staticDir ?? new URL('../../web/dist', import.meta.url).pathname
  const env = options.env ?? process.env
  const db = options.controlLedgerDb ?? openControlLedger(controlLedgerPath(config.dataDir))

  app.use('*', requestSizeLimit(config.maxInputBytes))
  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  app.use('/api/auth/signout', requireSameOrigin(config.publicOrigin))
  app.route('/api/auth', createAuthRoutes({ db, env, sessionTtl: DEFAULT_SESSION_TTL }))

  app.use('/api/access/*', sessionMiddleware(db, env, DEFAULT_SESSION_TTL))

  app.use('/api/account/*', sessionMiddleware(db, env, DEFAULT_SESSION_TTL))
  app.use('/api/account/*', requireSameOrigin(config.publicOrigin))
  app.use('/api/account/*', async (c, next) => {
    c.set('controlLedger', db)
    await next()
  })

  mountApiRoutes(app)

  app.use('*', serveStatic({ root: staticDir }))

  return app
}
