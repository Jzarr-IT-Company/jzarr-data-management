import app from './app.js'
import { env } from './config/loadEnv.js'
import { logger } from './config/logger.js'

app.listen(env.PORT, () => {
  logger.info(`Jzarr Data Manage backend running on port ${env.PORT}`)
})
