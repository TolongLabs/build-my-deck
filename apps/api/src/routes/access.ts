import { Hono } from 'hono'
import '../admission/hono-context'

export const accessRoutes = new Hono()

accessRoutes.get('/status', (c) => {
  const session = c.get('session')
  if (!session) return c.json({ authenticated: false })
  return c.json({ authenticated: true, userId: session.userId })
})
