import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  loginController,
  logoutController,
  meController,
  refreshController,
} from '../controller/auth.controller.js'
import { loginSchema, refreshSchema } from '../validator/auth.validator.js'

export const authRouter = Router()

authRouter.post('/login', validationMiddleware(loginSchema), loginController)
authRouter.post('/refresh', validationMiddleware(refreshSchema), refreshController)
authRouter.post('/logout', validationMiddleware(refreshSchema), logoutController)
authRouter.get('/me', authMiddleware, meController)
