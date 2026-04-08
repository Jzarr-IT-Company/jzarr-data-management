import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import { buildLeadReportFilename } from '../services/report.helpers.js'
import { exportLeadsReportService, getLeadsReportService } from '../services/report.service.js'

export async function leadsReportController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const report = await getLeadsReportService(req.user.id, req.user.role, {
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

  return res.status(HTTP_STATUS.OK).json(successResponse('Leads report fetched', report))
}

export async function exportLeadsReportController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const payload = await exportLeadsReportService(req.user.id, req.user.role, {
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

  const format = String(req.query.format || 'excel').trim().toLowerCase()
  const isPdf = format === 'pdf'
  const statusLabel = payload.report.filters.status || 'all-statuses'
  const filename = buildLeadReportFilename(
    payload.report,
    statusLabel,
    isPdf ? 'pdf' : 'csv',
  )

  if (isPdf) {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(HTTP_STATUS.OK).send(payload.pdf)
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  return res.status(HTTP_STATUS.OK).send(payload.csv)
}
