import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { ApiConfig } from './config'
import { requestSizeLimit } from './request-limits'
import { mountApiRoutes } from './routes'

export interface CreateAppOptions {
  /** Directory of the built Vite bundle. Defaults relative to this file's own location. */
  staticDir?: string
}

/**
 * The one Hono service: health, the built web bundle, and every route mounted by task 1's
 * (unedited) route index. Request bodies are bounded before any paid content is parsed.
 */
export function createApp(config: ApiConfig, options: CreateAppOptions = {}): Hono {
  const app = new Hono()
  const staticDir = options.staticDir ?? new URL('../../web/dist', import.meta.url).pathname

  app.use('*', requestSizeLimit(config.maxInputBytes))
  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  mountApiRoutes(app)

  app.use('*', serveStatic({ root: staticDir }))

  return app
}
