import { Router } from 'express'

import { getHealth } from '../controller/health.controller.js'

export const healthRouter = Router()

healthRouter.get('/', getHealth)
