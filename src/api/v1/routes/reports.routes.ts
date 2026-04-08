import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreenAccess } from '../middleware/screen.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { exportLeadsReportController, leadsReportController } from '../controller/report.controller.js'

export const reportsRouter = Router()

reportsRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER', 'SUB_ADMIN'))

reportsRouter.get('/leads', requireScreenAccess('reports', ['ADMIN', 'MANAGER']), leadsReportController)
reportsRouter.get(
  '/leads/export',
  requireScreenAccess('reports', ['ADMIN', 'MANAGER']),
  exportLeadsReportController
)
