import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createLeadService,
  deleteLeadService,
  getLeadService,
  listLeadsService,
  updateLeadService,
} from '../services/lead.service.js'

function getLeadIdParam(req: Request) {
  const leadId = req.params.leadId

  if (typeof leadId !== 'string') {
    return undefined
  }

  return leadId.trim()
}

export async function listLeadsController(req: Request, res: Response) {
  const leads = await listLeadsService(req.user!.id, req.user?.role, {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    departmentId:
      typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
  })

  return res.status(HTTP_STATUS.OK).json(successResponse('Leads fetched', leads))
}

export async function getLeadController(req: Request, res: Response) {
  const leadId = getLeadIdParam(req)

  if (!leadId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const lead = await getLeadService(req.user!.id, req.user?.role, leadId)

  if (!lead) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Lead not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Lead fetched', lead))
}

export async function createLeadController(req: Request, res: Response) {
  const lead = await createLeadService(req.user!.id, req.user?.role, req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Lead created', lead))
}

export async function updateLeadController(req: Request, res: Response) {
  const leadId = getLeadIdParam(req)

  if (!leadId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const lead = await updateLeadService(req.user!.id, req.user?.role, leadId, req.body)

  if (!lead) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Lead not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Lead updated', lead))
}

export async function deleteLeadController(req: Request, res: Response) {
  const leadId = getLeadIdParam(req)

  if (!leadId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteLeadService(req.user!.id, req.user?.role, leadId)

  if (!deleted) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Lead not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Lead deleted'))
}
