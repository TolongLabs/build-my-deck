import { loadConfig } from './config'
import { createApp } from './server'

const app = createApp(loadConfig())

export default app
