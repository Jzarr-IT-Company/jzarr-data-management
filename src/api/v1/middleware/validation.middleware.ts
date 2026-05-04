import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'

import { HTTP_STATUS, errorResponse } from '../../../constant/index.js'

function formatValidationIssues(issues: Array<{ path: (string | number)[]; message: string }>) {
  if (!issues.length) {
    return 'Validation failed'
  }

  const formattedIssues = issues
    .map((issue) => {
      const fieldPath = issue.path.length ? issue.path.join('.') : 'body'

      return `${fieldPath}: ${issue.message}`
    })
    .join('; ')

  return `Validation failed: ${formattedIssues}`
}

export function validationMiddleware(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }))

      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          ...errorResponse(formatValidationIssues(issues), HTTP_STATUS.BAD_REQUEST),
          errors: issues,
        })
    }

    req.body = result.data
    return next()
  }
}
