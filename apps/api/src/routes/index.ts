import type { Hono } from 'hono'
import { accessRoutes } from './access'
import { accountRoutes } from './account'
import { exportRoutes } from './export'
import { generationRoutes } from './generation'

export const mountApiRoutes = (app: Hono) => {
  app.route('/api/access', accessRoutes)
  app.route('/api/account', accountRoutes)
  app.route('/api/generation', generationRoutes)
  app.route('/api/export', exportRoutes)

  return app
}
