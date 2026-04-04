import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createDepartmentController,
  deleteDepartmentController,
  getDepartmentController,
  listDepartmentsController,
  updateDepartmentController,
  updateDepartmentStatusController,
} from '../controller/department.controller.js'
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateDepartmentStatusSchema,
} from '../validator/department.validator.js'

export const departmentsRouter = Router()

departmentsRouter.use(authMiddleware)

departmentsRouter.get('/', listDepartmentsController)
departmentsRouter.get('/:departmentId', getDepartmentController)
departmentsRouter.post(
  '/',
  requireRoles('ADMIN'),
  validationMiddleware(createDepartmentSchema),
  createDepartmentController
)
departmentsRouter.patch(
  '/:departmentId',
  requireRoles('ADMIN'),
  validationMiddleware(updateDepartmentSchema),
  updateDepartmentController
)
departmentsRouter.patch(
  '/:departmentId/status',
  requireRoles('ADMIN'),
  validationMiddleware(updateDepartmentStatusSchema),
  updateDepartmentStatusController
)
departmentsRouter.delete('/:departmentId', requireRoles('ADMIN'), deleteDepartmentController)
