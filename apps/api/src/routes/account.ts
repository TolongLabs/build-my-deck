import { Hono } from 'hono'
import '../admission/hono-context'
import { HttpError } from '../http-errors'
import { deleteUserCascade } from '../identity/users'
import { clearSessionCookie } from '../sessions/cookies'

export const accountRoutes = new Hono()

accountRoutes.delete('/', (c) => {
  const session = c.get('session')
  if (!session) {
    const error = new HttpError(401, 'unauthorized', 'Sign in required')
    return c.json(error.toResponseBody(), error.status)
  }

  const db = c.get('controlLedger')
  const result = deleteUserCascade(db, session.userId)
  clearSessionCookie(c)

  return c.json({ deleted: true, ...result })
})
