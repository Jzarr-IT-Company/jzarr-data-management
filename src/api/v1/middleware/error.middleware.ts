import type { ErrorRequestHandler } from 'express'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'

export const apiErrorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR
  const message = error.message || 'Internal server error'

  res.status(statusCode).json(errorResponse(message, statusCode))
}
