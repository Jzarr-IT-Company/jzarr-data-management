import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreens } from '../middleware/screen.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createManagerController,
  createSubAdminController,
  deleteManagerController,
  deleteSubAdminController,
  getManagerController,
  getSubAdminController,
  listManagersController,
  listSubAdminsController,
  resetManagerPasswordController,
  resetSubAdminPasswordController,
  updateManagerController,
  updateManagerStatusController,
  updateSubAdminController,
  updateSubAdminStatusController,
} from '../controller/user.controller.js'
import {
  createManagerSchema,
  createSubAdminSchema,
  resetManagerPasswordSchema,
  resetSubAdminPasswordSchema,
  updateManagerSchema,
  updateManagerStatusSchema,
  updateSubAdminSchema,
  updateSubAdminStatusSchema,
} from '../validator/user.validator.js'

export const usersRouter = Router()

usersRouter.use(authMiddleware)

usersRouter.get('/managers', requireScreens('managers'), listManagersController)
usersRouter.post(
  '/managers',
  requireScreens('managers'),
  validationMiddleware(createManagerSchema),
  createManagerController
)
usersRouter.get('/managers/:managerId', requireScreens('managers'), getManagerController)
usersRouter.patch(
  '/managers/:managerId',
  requireScreens('managers'),
  validationMiddleware(updateManagerSchema),
  updateManagerController
)
usersRouter.patch(
  '/managers/:managerId/status',
  requireScreens('managers'),
  validationMiddleware(updateManagerStatusSchema),
  updateManagerStatusController
)
usersRouter.patch(
  '/managers/:managerId/password',
  requireScreens('managers'),
  validationMiddleware(resetManagerPasswordSchema),
  resetManagerPasswordController
)
usersRouter.delete('/managers/:managerId', requireScreens('managers'), deleteManagerController)

usersRouter.get('/sub-admins', requireScreens('sub-admins'), listSubAdminsController)
usersRouter.post(
  '/sub-admins',
  requireScreens('sub-admins'),
  validationMiddleware(createSubAdminSchema),
  createSubAdminController
)
usersRouter.get('/sub-admins/:subAdminId', requireScreens('sub-admins'), getSubAdminController)
usersRouter.patch(
  '/sub-admins/:subAdminId',
  requireScreens('sub-admins'),
  validationMiddleware(updateSubAdminSchema),
  updateSubAdminController
)
usersRouter.patch(
  '/sub-admins/:subAdminId/status',
  requireScreens('sub-admins'),
  validationMiddleware(updateSubAdminStatusSchema),
  updateSubAdminStatusController
)
usersRouter.patch(
  '/sub-admins/:subAdminId/password',
  requireScreens('sub-admins'),
  validationMiddleware(resetSubAdminPasswordSchema),
  resetSubAdminPasswordController
)
usersRouter.delete('/sub-admins/:subAdminId', requireScreens('sub-admins'), deleteSubAdminController)
