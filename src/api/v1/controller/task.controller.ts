import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createTaskService,
  deleteTaskService,
  getTaskService,
  listTasksService,
  updateTaskService,
  updateTaskStatusService,
} from '../services/task.service.js'

function getTaskIdParam(req: Request) {
  const taskId = req.params.taskId

  if (typeof taskId !== 'string') {
    return undefined
  }

  return taskId.trim()
}

export async function listTasksController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const tasks = await listTasksService(req.user.id, req.user.role, {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    priority: typeof req.query.priority === 'string' ? req.query.priority : undefined,
    managerId: typeof req.query.managerId === 'string' ? req.query.managerId : undefined,
    departmentId:
      typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
    page: typeof req.query.page === 'string' ? req.query.page : undefined,
    limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
  })

  return res.status(HTTP_STATUS.OK).json(successResponse('Tasks fetched', tasks))
}

export async function getTaskController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const taskId = getTaskIdParam(req)

  if (!taskId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Task id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const task = await getTaskService(req.user.id, req.user.role, taskId)

  if (!task) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Task not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Task fetched', task))
}

export async function createTaskController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const task = await createTaskService(req.user.id, req.user.role, req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Task created', task))
}

export async function updateTaskController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const taskId = getTaskIdParam(req)

  if (!taskId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Task id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const task = await updateTaskService(req.user.id, req.user.role, taskId, req.body)

  if (!task) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Task not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Task updated', task))
}

export async function updateTaskStatusController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const taskId = getTaskIdParam(req)

  if (!taskId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Task id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const task = await updateTaskStatusService(req.user.id, req.user.role, taskId, req.body)

  if (!task) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Task not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Task status updated', task))
}

export async function deleteTaskController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const taskId = getTaskIdParam(req)

  if (!taskId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Task id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteTaskService(req.user.id, req.user.role, taskId)

  if (!deleted) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Task not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Task deleted'))
}
