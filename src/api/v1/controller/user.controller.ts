import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createManagerService,
  deleteManagerService,
  getManagerService,
  listManagersService,
  resetManagerPasswordService,
  updateManagerService,
  updateManagerStatusService,
} from '../services/user.service.js'

function getManagerIdParam(req: Request) {
  const managerId = req.params.managerId

  if (typeof managerId !== 'string') {
    return undefined
  }

  return managerId.trim()
}

export async function listManagersController(_req: Request, res: Response) {
  const managers = await listManagersService()

  return res.status(HTTP_STATUS.OK).json(successResponse('Managers fetched', managers))
}

export async function createManagerController(req: Request, res: Response) {
  const result = await createManagerService(req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Manager created', result))
}

export async function getManagerController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const manager = await getManagerService(managerId)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager fetched', manager))
}

export async function updateManagerController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const manager = await updateManagerService(managerId, req.body)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager updated', manager))
}

export async function updateManagerStatusController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { status } = req.body as { status: 'ACTIVE' | 'INACTIVE' }
  const manager = await updateManagerStatusService(managerId, status)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager status updated', manager))
}

export async function resetManagerPasswordController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { password } = req.body as { password: string }
  const manager = await resetManagerPasswordService(managerId, password)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(successResponse('Manager password reset successfully', manager))
}

export async function deleteManagerController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteManagerService(managerId)

  if (!deleted) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager deleted'))
}
