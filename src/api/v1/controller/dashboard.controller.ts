import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import { getDashboardOverviewService } from '../services/dashboard.service.js'
import { getMyStatsService, getTeamDashboardService } from '../services/team.dashboard.service.js'
import { getMyWorkService } from '../services/myWork.service.js'

export async function dashboardOverviewController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const overview = await getDashboardOverviewService(req.user.id, req.user.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Dashboard overview fetched', overview))
}

export async function teamDashboardController(req: Request, res: Response) {
  const data = await getTeamDashboardService(req.user!.id, req.user?.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Team dashboard fetched', data))
}

export async function myStatsController(req: Request, res: Response) {
  const data = await getMyStatsService(req.user!.id)

  return res.status(HTTP_STATUS.OK).json(successResponse('My stats fetched', data))
}

export async function myWorkController(req: Request, res: Response) {
  const data = await getMyWorkService(req.user!.id)

  return res.status(HTTP_STATUS.OK).json(successResponse('My work fetched', data))
}
