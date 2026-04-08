import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import {
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationAsReadController,
} from '../controller/notification.controller.js'

export const notificationRouter = Router()

notificationRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER'))

notificationRouter.get('/', listNotificationsController)
notificationRouter.patch('/read-all', markAllNotificationsReadController)
notificationRouter.patch('/:notificationId/read', markNotificationAsReadController)
