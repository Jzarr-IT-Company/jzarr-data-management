import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreenAccess } from '../middleware/screen.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createStoreController,
  deleteStoreController,
  exportStoreReportController,
  getStoreController,
  getStoreReportController,
  listStoresController,
  updateStoreController,
  updateStoreStatusController,
  upsertStoreStatController,
} from '../controller/store.controller.js'
import {
  createStoreSchema,
  updateStoreSchema,
  updateStoreStatusSchema,
  upsertStoreStatSchema,
} from '../validator/store.validator.js'

export const storesRouter = Router()

storesRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER', 'SUB_ADMIN'))

storesRouter.get('/', requireScreenAccess('departments', ['ADMIN', 'MANAGER']), listStoresController)
storesRouter.post(
  '/',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER']),
  validationMiddleware(createStoreSchema),
  createStoreController
)
storesRouter.get(
  '/:storeId/report',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER']),
  getStoreReportController
)
storesRouter.get(
  '/:storeId/report/export',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER']),
  exportStoreReportController
)
storesRouter.get('/:storeId', requireScreenAccess('departments', ['ADMIN', 'MANAGER']), getStoreController)
storesRouter.patch(
  '/:storeId',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER']),
  validationMiddleware(updateStoreSchema),
  updateStoreController
)
storesRouter.patch(
  '/:storeId/status',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER']),
  validationMiddleware(updateStoreStatusSchema),
  updateStoreStatusController,
)
storesRouter.post(
  '/:storeId/stats',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER']),
  validationMiddleware(upsertStoreStatSchema),
  upsertStoreStatController,
)
storesRouter.delete('/:storeId', requireScreenAccess('departments', ['ADMIN', 'MANAGER']), deleteStoreController)
