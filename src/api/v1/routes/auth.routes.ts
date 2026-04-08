import { Router } from 'express'

import { authMiddleware } from '../middleware/auth.middleware.js'
import { validationMiddleware } from '../middleware/validation.middleware.js'
import {
  changeCurrentUserPasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
} from '../controller/auth.controller.js'
import { changePasswordSchema, loginSchema, refreshSchema } from '../validator/auth.validator.js'

export const authRouter = Router()

authRouter.post('/login', validationMiddleware(loginSchema), loginController)
authRouter.post('/refresh', validationMiddleware(refreshSchema), refreshController)
authRouter.post('/logout', validationMiddleware(refreshSchema), logoutController)
authRouter.get('/me', authMiddleware, meController)
authRouter.patch(
  '/me/password',
  authMiddleware,
  validationMiddleware(changePasswordSchema),
  changeCurrentUserPasswordController,
)
