import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createFilerServiceService,
  deleteFilerServiceService,
  listFilerServicesService,
  updateFilerServiceService,
} from '../services/filerService.service.js'

function getServiceIdParam(req: Request) {
  const serviceId = req.params.serviceId
  return typeof serviceId === 'string' ? serviceId.trim() : undefined
}

export async function listFilerServicesController(req: Request, res: Response) {
  const services = await listFilerServicesService()
  return res.status(HTTP_STATUS.OK).json(successResponse('Services fetched', services))
}

export async function createFilerServiceController(req: Request, res: Response) {
  const service = await createFilerServiceService(req.body)
  return res.status(HTTP_STATUS.CREATED).json(successResponse('Service created', service))
}

export async function updateFilerServiceController(req: Request, res: Response) {
  const serviceId = getServiceIdParam(req)

  if (!serviceId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Service id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const service = await updateFilerServiceService(serviceId, req.body)
  return res.status(HTTP_STATUS.OK).json(successResponse('Service updated', service))
}

export async function deleteFilerServiceController(req: Request, res: Response) {
  const serviceId = getServiceIdParam(req)

  if (!serviceId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Service id is required', HTTP_STATUS.BAD_REQUEST))
  }

  await deleteFilerServiceService(serviceId)
  return res.status(HTTP_STATUS.OK).json(successResponse('Service deleted'))
}
