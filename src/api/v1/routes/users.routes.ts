import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createManagerController,
  deleteManagerController,
  getManagerController,
  listManagersController,
  resetManagerPasswordController,
  updateManagerController,
  updateManagerStatusController,
} from '../controller/user.controller.js'
import {
  createManagerSchema,
  resetManagerPasswordSchema,
  updateManagerSchema,
  updateManagerStatusSchema,
} from '../validator/user.validator.js'

export const usersRouter = Router()

usersRouter.use(authMiddleware, requireRoles('ADMIN'))

usersRouter.get('/managers', listManagersController)
usersRouter.post('/managers', validationMiddleware(createManagerSchema), createManagerController)
usersRouter.get('/managers/:managerId', getManagerController)
usersRouter.patch('/managers/:managerId', validationMiddleware(updateManagerSchema), updateManagerController)
usersRouter.patch(
  '/managers/:managerId/status',
  validationMiddleware(updateManagerStatusSchema),
  updateManagerStatusController
)
usersRouter.patch(
  '/managers/:managerId/password',
  validationMiddleware(resetManagerPasswordSchema),
  resetManagerPasswordController
)
usersRouter.delete('/managers/:managerId', deleteManagerController)
