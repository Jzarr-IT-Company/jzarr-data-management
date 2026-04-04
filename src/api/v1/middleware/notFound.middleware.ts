import type { RequestHandler } from 'express'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'

export const notFoundMiddleware: RequestHandler = (_req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Route not found', HTTP_STATUS.NOT_FOUND))
}
