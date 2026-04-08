import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  changeCurrentUserPasswordService,
  getCurrentUserService,
  loginService,
  logoutService,
  refreshSessionService,
} from '../services/auth.service.js'

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string }
  const result = await loginService(email, password)

  if (!result) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Invalid email or password', HTTP_STATUS.UNAUTHORIZED))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Login successful', result))
}

export async function refreshController(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string }
  const result = await refreshSessionService(refreshToken)

  if (!result) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Session refreshed', result))
}

export async function logoutController(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string }
  const revoked = await logoutService(refreshToken)

  if (!revoked) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Logout successful'))
}

export async function meController(req: Request, res: Response) {
  const currentUserId = req.user?.id

  if (!currentUserId) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const user = await getCurrentUserService(currentUserId)

  if (!user) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('User not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Current user fetched', user))
}

export async function changeCurrentUserPasswordController(req: Request, res: Response) {
  const currentUserId = req.user?.id

  if (!currentUserId) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string
    newPassword: string
  }

  const result = await changeCurrentUserPasswordService(
    currentUserId,
    currentPassword,
    newPassword,
  )

  if (result === 'INVALID_CURRENT_PASSWORD') {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Current password is incorrect', HTTP_STATUS.UNAUTHORIZED))
  }

  if (!result) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('User not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Password updated successfully', result))
}
