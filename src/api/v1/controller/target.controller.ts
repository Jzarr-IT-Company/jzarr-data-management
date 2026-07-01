import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createTargetService,
  deleteTargetService,
  getTargetAssignableUsersService,
  getTargetService,
  listGivenTargetsService,
  listMyTargetsService,
  updateTargetService,
} from '../services/target.service.js'

export async function targetAssignableUsersController(req: Request, res: Response) {
  const users = await getTargetAssignableUsersService(req.user!.id, req.user?.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Assignable users fetched', users))
}

function getTargetId(req: Request): string | undefined {
  const id = req.params.targetId
  return typeof id === 'string' ? id.trim() : undefined
}

export async function createTargetController(req: Request, res: Response) {
  const target = await createTargetService(req.user!.id, req.user?.role, req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Target created', target))
}

export async function updateTargetController(req: Request, res: Response) {
  const targetId = getTargetId(req)

  if (!targetId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Target ID is required', HTTP_STATUS.BAD_REQUEST))
  }

  const target = await updateTargetService(req.user!.id, req.user?.role, targetId, req.body)

  return res.status(HTTP_STATUS.OK).json(successResponse('Target updated', target))
}

export async function deleteTargetController(req: Request, res: Response) {
  const targetId = getTargetId(req)

  if (!targetId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Target ID is required', HTTP_STATUS.BAD_REQUEST))
  }

  await deleteTargetService(req.user!.id, req.user?.role, targetId)

  return res.status(HTTP_STATUS.OK).json(successResponse('Target deleted', null))
}

export async function listMyTargetsController(req: Request, res: Response) {
  const targets = await listMyTargetsService(req.user!.id)

  return res.status(HTTP_STATUS.OK).json(successResponse('My targets fetched', targets))
}

export async function listGivenTargetsController(req: Request, res: Response) {
  const targets = await listGivenTargetsService(req.user!.id)

  return res.status(HTTP_STATUS.OK).json(successResponse('Given targets fetched', targets))
}

export async function getTargetController(req: Request, res: Response) {
  const targetId = getTargetId(req)

  if (!targetId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Target ID is required', HTTP_STATUS.BAD_REQUEST))
  }

  const target = await getTargetService(req.user!.id, req.user?.role, targetId)

  return res.status(HTTP_STATUS.OK).json(successResponse('Target fetched', target))
}
