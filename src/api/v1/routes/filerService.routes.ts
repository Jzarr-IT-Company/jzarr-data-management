import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createFilerServiceController,
  deleteFilerServiceController,
  listFilerServicesController,
  updateFilerServiceController,
} from '../controller/filerService.controller.js'
import {
  createFilerServiceSchema,
  updateFilerServiceSchema,
} from '../validator/filerService.validator.js'

export const filerServiceRouter = Router()

filerServiceRouter.use(authMiddleware)

// All authenticated roles can list services (needed for the lead form dropdown)
filerServiceRouter.get('/', listFilerServicesController)

// Only admin can manage services
filerServiceRouter.post(
  '/',
  requireRoles('ADMIN'),
  validationMiddleware(createFilerServiceSchema),
  createFilerServiceController,
)
filerServiceRouter.patch(
  '/:serviceId',
  requireRoles('ADMIN'),
  validationMiddleware(updateFilerServiceSchema),
  updateFilerServiceController,
)
filerServiceRouter.delete(
  '/:serviceId',
  requireRoles('ADMIN'),
  deleteFilerServiceController,
)
