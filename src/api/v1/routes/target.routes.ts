import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRoles } from '../middleware/role.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  createTargetController,
  deleteTargetController,
  getTargetController,
  listGivenTargetsController,
  listMyTargetsController,
  targetAssignableUsersController,
  updateTargetController,
} from '../controller/target.controller.js'
import { createTargetSchema, updateTargetSchema } from '../validator/target.validator.js'

export const targetRouter = Router()

targetRouter.use(authMiddleware)

// My received targets (all roles can view their own)
targetRouter.get('/mine', listMyTargetsController)

// Users I can assign targets to (one level down the hierarchy)
targetRouter.get(
  '/assignable-users',
  requireRoles('ADMIN', 'SUB_ADMIN', 'MANAGER'),
  targetAssignableUsersController,
)

// Targets I created for others (admin, sub_admin, manager)
targetRouter.get(
  '/given',
  requireRoles('ADMIN', 'SUB_ADMIN', 'MANAGER'),
  listGivenTargetsController,
)

// Create a target for someone below you
targetRouter.post(
  '/',
  requireRoles('ADMIN', 'SUB_ADMIN', 'MANAGER'),
  validationMiddleware(createTargetSchema),
  createTargetController,
)

// Get single target detail
targetRouter.get('/:targetId', getTargetController)

// Update a target (creator or admin only — enforced in service)
targetRouter.patch(
  '/:targetId',
  requireRoles('ADMIN', 'SUB_ADMIN', 'MANAGER'),
  validationMiddleware(updateTargetSchema),
  updateTargetController,
)

// Delete a target (creator or admin only — enforced in service)
targetRouter.delete(
  '/:targetId',
  requireRoles('ADMIN', 'SUB_ADMIN', 'MANAGER'),
  deleteTargetController,
)
