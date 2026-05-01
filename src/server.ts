import { createServer } from 'node:http'

import app from './app.js'
import { env } from './config/loadEnv.js'
import { logger } from './config/logger.js'
import { initializeLeadFollowUpReminderScheduler } from './api/v1/services/followUpReminder.service.js'
import { initializeTaskSocket } from './socket/task-socket.js'

const server = createServer(app)
initializeTaskSocket(server)
initializeLeadFollowUpReminderScheduler()

server.listen(env.PORT, () => {
  logger.info(`Jzarr Data Manage backend running on port ${env.PORT}`)
})
