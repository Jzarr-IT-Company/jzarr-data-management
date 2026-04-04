import type { RequestHandler } from 'express'
import type { UserRole } from '@prisma/client'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'

export function requireRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(HTTP_STATUS.FORBIDDEN)
        .json(errorResponse('Forbidden', HTTP_STATUS.FORBIDDEN))
    }

    return next()
  }
}
