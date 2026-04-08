import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
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

taskRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER'))

taskRouter.get('/', listTasksController)
taskRouter.get('/:taskId', getTaskController)
taskRouter.post('/', validationMiddleware(createTaskSchema), createTaskController)
taskRouter.patch('/:taskId', validationMiddleware(updateTaskSchema), updateTaskController)
taskRouter.patch(
  '/:taskId/status',
  validationMiddleware(updateTaskStatusSchema),
  updateTaskStatusController,
)
taskRouter.delete('/:taskId', deleteTaskController)
