import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import {
  dashboardOverviewController,
  myStatsController,
  myWorkController,
  teamDashboardController,
} from '../controller/dashboard.controller.js'

export const dashboardRouter = Router()

dashboardRouter.use(authMiddleware)

dashboardRouter.get('/overview', dashboardOverviewController)

// My personal performance stats (all roles)
dashboardRouter.get('/my-stats', myStatsController)

// My Work hub — targets + assigned leads + pipeline + tasks (all roles)
dashboardRouter.get('/my-work', myWorkController)

// Team dashboard — manager sees agents, sub_admin sees managers, admin sees all
dashboardRouter.get(
  '/team',
  requireRoles('ADMIN', 'SUB_ADMIN', 'MANAGER'),
  teamDashboardController,
)
