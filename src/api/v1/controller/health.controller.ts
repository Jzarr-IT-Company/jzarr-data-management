import type { Request, Response } from 'express'

import { successResponse } from '../../../constant/index.js'
import { getHealthServiceMessage } from '../services/health.service.js'

export function getHealth(_req: Request, res: Response) {
  res.json(successResponse(getHealthServiceMessage()))
}
