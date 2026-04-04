import type { RequestHandler } from 'express'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'
import { verifyAccessToken } from '../../../utils/auth.js'

export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const token = authHeader.slice(7)

  try {
    req.user = verifyAccessToken(token)
    return next()
  } catch {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED))
  }
}
