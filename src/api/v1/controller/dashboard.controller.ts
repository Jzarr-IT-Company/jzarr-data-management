import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import { getDashboardOverviewService } from '../services/dashboard.service.js'

export async function dashboardOverviewController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const overview = await getDashboardOverviewService(req.user.id, req.user.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Dashboard overview fetched', overview))
}
