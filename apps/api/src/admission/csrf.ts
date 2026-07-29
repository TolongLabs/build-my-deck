import type { MiddlewareHandler } from 'hono'
import { HttpError } from '../http-errors'

/**
 * Defense-in-depth against CSRF on state-changing routes, beyond `SameSite=Lax`: requires the
 * `Origin` header — which browsers always attach to non-GET fetches, same-origin or not — to
 * match the configured public origin. A cross-site page can still cause the cookie-bearing
 * request to be sent, but a missing or mismatched `Origin` lets the server refuse to act on it.
 */
export function requireSameOrigin(expectedOrigin: string): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin')
    if (origin !== expectedOrigin) {
      const error = new HttpError(403, 'unauthorized', 'Cross-origin request rejected')
      return c.json(error.toResponseBody(), error.status)
    }
    await next()
  }
}
