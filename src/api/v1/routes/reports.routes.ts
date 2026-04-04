import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { leadsReportController } from '../controller/report.controller.js'

export const reportsRouter = Router()

reportsRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER'))

reportsRouter.get('/leads', leadsReportController)
