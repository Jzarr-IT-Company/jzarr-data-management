import { Router, text } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireScreenAccess } from '../middleware/screen.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  exportLeadsController,
  importLeadsController,
} from '../controller/importExport.controller.js'
import {
  createLeadController,
  deleteLeadController,
  getLeadController,
  listLeadsController,
  updateLeadController,
} from '../controller/lead.controller.js'
import { createLeadSchema, updateLeadSchema } from '../validator/lead.validator.js'

export const leadsRouter = Router()

leadsRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER', 'MANAGER_USER', 'SUB_ADMIN'))

leadsRouter.get(
  '/',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER', 'MANAGER_USER']),
  listLeadsController
)
leadsRouter.get('/export', requireScreenAccess('import-export', ['ADMIN', 'MANAGER']), exportLeadsController)
leadsRouter.post(
  '/import',
  requireScreenAccess('import-export', ['ADMIN', 'MANAGER']),
  text({ type: ['text/csv', 'text/plain', 'application/csv'] }),
  importLeadsController
)
leadsRouter.get(
  '/:leadId',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER', 'MANAGER_USER']),
  getLeadController
)
leadsRouter.post(
  '/',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER', 'MANAGER_USER']),
  validationMiddleware(createLeadSchema),
  createLeadController
)
leadsRouter.patch(
  '/:leadId',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER', 'MANAGER_USER']),
  validationMiddleware(updateLeadSchema),
  updateLeadController
)
leadsRouter.delete(
  '/:leadId',
  requireScreenAccess('departments', ['ADMIN', 'MANAGER', 'MANAGER_USER']),
  deleteLeadController
)
