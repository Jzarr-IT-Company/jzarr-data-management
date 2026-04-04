import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { dashboardOverviewController } from '../controller/dashboard.controller.js'

export const dashboardRouter = Router()

dashboardRouter.use(authMiddleware)

dashboardRouter.get('/overview', dashboardOverviewController)
