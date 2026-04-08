import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createStoreService,
  deleteStoreService,
  exportStoreReportService,
  getStoreReportService,
  getStoreService,
  listStoresService,
  updateStoreService,
  updateStoreStatusService,
  upsertStoreStatService,
} from '../services/store.service.js'

function getStoreIdParam(req: Request) {
  const storeId = req.params.storeId

  if (typeof storeId !== 'string') {
    return undefined
  }

  return storeId.trim()
}

export async function listStoresController(req: Request, res: Response) {
  const stores = await listStoresService(req.user!.id, req.user?.role, {
    departmentId: typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
  })

  return res.status(HTTP_STATUS.OK).json(successResponse('Stores fetched', stores))
}

export async function getStoreController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const store = await getStoreService(req.user!.id, req.user?.role, storeId)

  if (!store) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Store fetched', store))
}

export async function createStoreController(req: Request, res: Response) {
  const store = await createStoreService(req.user!.id, req.user?.role, req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Store created', store))
}

export async function updateStoreController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const store = await updateStoreService(req.user!.id, req.user?.role, storeId, req.body)

  if (!store) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Store updated', store))
}

export async function updateStoreStatusController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const store = await updateStoreStatusService(
    req.user!.id,
    req.user?.role,
    storeId,
    Boolean(req.body?.isActive),
  )

  if (!store) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Store status updated', store))
}

export async function deleteStoreController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteStoreService(req.user!.id, req.user?.role, storeId)

  if (!deleted) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Store deleted'))
}

export async function upsertStoreStatController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const stat = await upsertStoreStatService(req.user!.id, req.user?.role, storeId, req.body)

  if (!stat) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Store stats saved', stat))
}

export async function getStoreReportController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const report = await getStoreReportService(req.user!.id, req.user?.role, storeId, {
    range: typeof req.query.range === 'string' ? req.query.range : undefined,
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
  })

  if (!report) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Store report fetched', report))
}

export async function exportStoreReportController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const payload = await exportStoreReportService(req.user!.id, req.user?.role, storeId, {
    range: typeof req.query.range === 'string' ? req.query.range : undefined,
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
  })

  if (!payload) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  const format = String(req.query.format || 'excel').trim().toLowerCase()
  const isPdf = format === 'pdf'
  const filename = `${payload.report.store.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${
    payload.report.range
  }-report.${isPdf ? 'pdf' : 'csv'}`

  if (isPdf) {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(HTTP_STATUS.OK).send(payload.pdf)
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  return res.status(HTTP_STATUS.OK).send(payload.csv)
}
