import { Hono } from 'hono'
import { mountApiRoutes } from './routes'

const app = mountApiRoutes(new Hono())

export default app
