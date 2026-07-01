import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  assignLeadsService,
  getAssignableUsersService,
  getLeadAssignmentsService,
} from '../services/lead.assignment.service.js'

export async function assignLeadsController(req: Request, res: Response) {
  const { leadIds, assignToUserId, note } = req.body as {
    leadIds: string[]
    assignToUserId: string
    note?: string
  }

  const result = await assignLeadsService(req.user!.id, req.user?.role, {
    leadIds,
    assignToUserId,
    note,
  })

  return res.status(HTTP_STATUS.OK).json(successResponse('Leads assigned successfully', result))
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export async function getLeadAssignmentsController(req: Request, res: Response) {
  const leadId = getStringParam(req.params.leadId)

  if (!leadId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Lead ID is required', HTTP_STATUS.BAD_REQUEST))
  }

  const assignments = await getLeadAssignmentsService(
    req.user!.id,
    req.user?.role,
    leadId,
    req.user?.allowedScreens,
  )

  return res.status(HTTP_STATUS.OK).json(successResponse('Assignment history fetched', assignments))
}

export async function getAssignableUsersController(req: Request, res: Response) {
  const users = await getAssignableUsersService(req.user!.id, req.user?.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Assignable users fetched', users))
}
