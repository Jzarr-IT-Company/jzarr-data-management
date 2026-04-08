import type { RequestHandler } from 'express'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'
import type { UserRole } from '../../../types/user-role.js'

type ScreenKey = string

function normalizeScreenKey(value: string) {
  return value.trim().toLowerCase()
}

export function requireScreens(...allowedScreens: ScreenKey[]): RequestHandler {
  const normalizedAllowedScreens = allowedScreens.map(normalizeScreenKey)

  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
    }

    if (req.user.role === 'ADMIN') {
      return next()
    }

    const userScreens = Array.isArray(req.user.allowedScreens)
      ? req.user.allowedScreens.map(normalizeScreenKey)
      : []

    const hasAccess = normalizedAllowedScreens.some((screen) => userScreens.includes(screen))

    if (!hasAccess) {
      return res
        .status(HTTP_STATUS.FORBIDDEN)
        .json(errorResponse('Forbidden', HTTP_STATUS.FORBIDDEN))
    }

    return next()
  }
}

export function requireScreenAccess(
  screen: ScreenKey,
  allowedRoles: UserRole[] = ['ADMIN'],
): RequestHandler {
  const normalizedScreen = normalizeScreenKey(screen)

  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
    }

    if (allowedRoles.includes(req.user.role)) {
      return next()
    }

    const userScreens = Array.isArray(req.user.allowedScreens)
      ? req.user.allowedScreens.map(normalizeScreenKey)
      : []

    if (req.user.role === 'SUB_ADMIN' && userScreens.includes(normalizedScreen)) {
      return next()
    }

    return res
      .status(HTTP_STATUS.FORBIDDEN)
      .json(errorResponse('Forbidden', HTTP_STATUS.FORBIDDEN))
  }
}
