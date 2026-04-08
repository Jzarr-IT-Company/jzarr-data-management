import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreenAccess } from '../middleware/screen.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  listTasksController,
  updateTaskController,
  updateTaskStatusController,
} from '../controller/task.controller.js'
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validator/task.validator.js'

export const taskRouter = Router()

taskRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER', 'SUB_ADMIN'))

taskRouter.get('/', requireScreenAccess('tasks', ['ADMIN', 'MANAGER']), listTasksController)
taskRouter.get('/:taskId', requireScreenAccess('tasks', ['ADMIN', 'MANAGER']), getTaskController)
taskRouter.post(
  '/',
  requireScreenAccess('tasks', ['ADMIN', 'MANAGER']),
  validationMiddleware(createTaskSchema),
  createTaskController,
)
taskRouter.patch(
  '/:taskId',
  requireScreenAccess('tasks', ['ADMIN', 'MANAGER']),
  validationMiddleware(updateTaskSchema),
  updateTaskController,
)
taskRouter.patch(
  '/:taskId/status',
  requireScreenAccess('tasks', ['ADMIN', 'MANAGER']),
  validationMiddleware(updateTaskStatusSchema),
  updateTaskStatusController,
)
taskRouter.delete('/:taskId', requireScreenAccess('tasks', ['ADMIN', 'MANAGER']), deleteTaskController)
