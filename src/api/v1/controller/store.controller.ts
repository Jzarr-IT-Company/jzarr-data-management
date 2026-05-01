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
  uploadStoreFilesService,
  upsertStoreStatService,
} from '../services/store.service.js'
import type { StoreFileCategory } from '../services/store.helpers.js'

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

function normalizeStoreFileCategory(value: unknown): StoreFileCategory | null {
  const category = String(value || '').trim().toUpperCase()

  if (category === 'AUDIT' || category === 'DOCUMENT' || category === 'PRODUCT_PSD') {
    return category
  }

  return null
}

function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
}

function isAllowedStoreFile(category: StoreFileCategory, file: Express.Multer.File) {
  const extension = getFileExtension(file.originalname)
  const mimeType = file.mimetype.toLowerCase()

  if (category === 'AUDIT') {
    return ['csv', 'xls', 'xlsx'].includes(extension)
  }

  if (category === 'DOCUMENT') {
    return (
      ['jpg', 'jpeg', 'png', 'pdf'].includes(extension) &&
      ['image/jpeg', 'image/png', 'application/pdf'].includes(mimeType)
    )
  }

  return extension === 'psd'
}

export async function uploadStoreFilesController(req: Request, res: Response) {
  const storeId = getStoreIdParam(req)
  const category = normalizeStoreFileCategory(req.body?.category)

  if (!storeId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Store id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (!category) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Valid file category is required', HTTP_STATUS.BAD_REQUEST))
  }

  const files = Array.isArray(req.files) ? req.files : []

  if (!files.length) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('At least one file is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (files.some((file) => !isAllowedStoreFile(category, file))) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('One or more files are not allowed for this upload category', HTTP_STATUS.BAD_REQUEST))
  }

  const uploadedFiles = await uploadStoreFilesService(
    req.user!.id,
    req.user?.role,
    storeId,
    category,
    files,
  )

  if (!uploadedFiles) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Store not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Store files uploaded', uploadedFiles))
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
