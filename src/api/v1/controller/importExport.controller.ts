import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import { exportLeadsCsvService, importLeadsCsvService } from '../services/importExport.service.js'

function buildImportCsvBody(body: unknown) {
  if (typeof body === 'string') {
    return body
  }

  if (body && typeof body === 'object' && 'csv' in body && typeof (body as { csv?: unknown }).csv === 'string') {
    return (body as { csv: string }).csv
  }

  return null
}

export async function exportLeadsController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const result = await exportLeadsCsvService(req.user.id, req.user.role, {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    departmentId:
      typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
    createdById:
      typeof req.query.createdById === 'string' ? req.query.createdById : undefined,
    fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
    toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
    page: typeof req.query.page === 'string' ? req.query.page : undefined,
    limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
  })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)

  return res.status(HTTP_STATUS.OK).send(result.csv)
}

export async function importLeadsController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const csvBody = buildImportCsvBody(req.body)

  if (!csvBody) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('CSV content is required', HTTP_STATUS.BAD_REQUEST))
  }

  const result = await importLeadsCsvService(req.user.id, req.user.role, csvBody)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Leads imported', result))
}
