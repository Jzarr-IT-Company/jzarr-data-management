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

function getStringQuery(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getNumberQuery(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  const numberValue = Number.parseInt(value, 10)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

export async function listLeadsController(req: Request, res: Response) {
  const leads = await listLeadsService(req.user!.id, req.user?.role, {
    search: getStringQuery(req.query.search),
    status: getStringQuery(req.query.status),
    departmentId: getStringQuery(req.query.departmentId),
    city: getStringQuery(req.query.city),
    managerId: getStringQuery(req.query.managerId),
    createdById: getStringQuery(req.query.createdById),
    serviceId: getStringQuery(req.query.serviceId),
    source: getStringQuery(req.query.source),
    assignment: getStringQuery(req.query.assignment),
    payment: getStringQuery(req.query.payment),
    fromDate: getStringQuery(req.query.fromDate),
    toDate: getStringQuery(req.query.toDate),
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
  }, req.user?.allowedScreens)

  return res.status(HTTP_STATUS.OK).json(successResponse('Leads fetched', leads))
}

export async function getLeadController(req: Request, res: Response) {
  const leadId = getLeadIdParam(req)

  if (!leadId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const lead = await getLeadService(req.user!.id, req.user?.role, leadId, req.user?.allowedScreens)

  if (!lead) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Lead not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Lead fetched', lead))
}

export async function createLeadController(req: Request, res: Response) {
  const lead = await createLeadService(req.user!.id, req.user?.role, req.body, req.user?.allowedScreens)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Lead created', lead))
}

export async function updateLeadController(req: Request, res: Response) {
  const leadId = getLeadIdParam(req)

  if (!leadId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const lead = await updateLeadService(req.user!.id, req.user?.role, leadId, req.body, req.user?.allowedScreens)

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

  const deleted = await deleteLeadService(req.user!.id, req.user?.role, leadId, req.user?.allowedScreens)

  if (!deleted) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Lead not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Lead deleted'))
}
