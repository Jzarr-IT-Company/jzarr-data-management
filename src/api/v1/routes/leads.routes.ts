import { Router, text } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
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

leadsRouter.use(authMiddleware, requireRoles('ADMIN', 'MANAGER'))

leadsRouter.get('/', listLeadsController)
leadsRouter.get('/export', exportLeadsController)
leadsRouter.post(
  '/import',
  text({ type: ['text/csv', 'text/plain', 'application/csv'] }),
  importLeadsController
)
leadsRouter.get('/:leadId', getLeadController)
leadsRouter.post('/', validationMiddleware(createLeadSchema), createLeadController)
leadsRouter.patch('/:leadId', validationMiddleware(updateLeadSchema), updateLeadController)
leadsRouter.delete('/:leadId', deleteLeadController)
