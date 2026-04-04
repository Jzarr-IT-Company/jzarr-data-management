import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'

export function validationMiddleware(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(errorResponse('Validation failed', HTTP_STATUS.BAD_REQUEST))
    }

    req.body = result.data
    return next()
  }
}
