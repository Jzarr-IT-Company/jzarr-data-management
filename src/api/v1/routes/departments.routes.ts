import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreens } from '../middleware/screen.middleware.js'
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
  requireScreens('department-setup'),
  validationMiddleware(createDepartmentSchema),
  createDepartmentController
)
departmentsRouter.patch(
  '/:departmentId',
  requireScreens('department-setup'),
  validationMiddleware(updateDepartmentSchema),
  updateDepartmentController
)
departmentsRouter.patch(
  '/:departmentId/status',
  requireScreens('department-setup'),
  validationMiddleware(updateDepartmentStatusSchema),
  updateDepartmentStatusController
)
departmentsRouter.delete('/:departmentId', requireScreens('department-setup'), deleteDepartmentController)
