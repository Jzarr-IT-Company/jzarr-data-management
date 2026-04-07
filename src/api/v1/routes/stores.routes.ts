import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
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

storesRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER'))

storesRouter.get('/', listStoresController)
storesRouter.post('/', validationMiddleware(createStoreSchema), createStoreController)
storesRouter.get('/:storeId/report', getStoreReportController)
storesRouter.get('/:storeId/report/export', exportStoreReportController)
storesRouter.get('/:storeId', getStoreController)
storesRouter.patch('/:storeId', validationMiddleware(updateStoreSchema), updateStoreController)
storesRouter.patch(
  '/:storeId/status',
  validationMiddleware(updateStoreStatusSchema),
  updateStoreStatusController,
)
storesRouter.post(
  '/:storeId/stats',
  validationMiddleware(upsertStoreStatSchema),
  upsertStoreStatController,
)
storesRouter.delete('/:storeId', deleteStoreController)
