import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreenAccess } from '../middleware/screen.middleware.js'
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

// Admin or sub admin with filer-services screen can manage services
filerServiceRouter.post(
  '/',
  requireScreenAccess('filer-services'),
  validationMiddleware(createFilerServiceSchema),
  createFilerServiceController,
)
filerServiceRouter.patch(
  '/:serviceId',
  requireScreenAccess('filer-services'),
  validationMiddleware(updateFilerServiceSchema),
  updateFilerServiceController,
)
filerServiceRouter.delete(
  '/:serviceId',
  requireScreenAccess('filer-services'),
  deleteFilerServiceController,
)
