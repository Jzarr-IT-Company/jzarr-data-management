import { Router } from 'express'

import { authRouter } from './auth.routes.js'
import { dashboardRouter } from './dashboard.routes.js'
import { departmentsRouter } from './departments.routes.js'
import { healthRouter } from './health.routes.js'
import { leadsRouter } from './leads.routes.js'
import { reportsRouter } from './reports.routes.js'
import { storesRouter } from './stores.routes.js'
import { usersRouter } from './users.routes.js'

export const v1Router = Router()

v1Router.use('/auth', authRouter)
v1Router.use('/dashboard', dashboardRouter)
v1Router.use('/departments', departmentsRouter)
v1Router.use('/stores', storesRouter)
v1Router.use('/leads', leadsRouter)
v1Router.use('/reports', reportsRouter)
v1Router.use('/admin/users', usersRouter)
v1Router.use('/health', healthRouter)
