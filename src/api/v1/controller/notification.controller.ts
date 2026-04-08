import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  listNotificationsService,
  markAllNotificationsReadService,
  markNotificationAsReadService,
} from '../services/notification.service.js'

function getNotificationIdParam(req: Request) {
  const notificationId = req.params.notificationId

  if (typeof notificationId !== 'string') {
    return undefined
  }

  return notificationId.trim()
}

export async function listNotificationsController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const notifications = await listNotificationsService(req.user.id, req.user.role)

  return res
    .status(HTTP_STATUS.OK)
    .json(successResponse('Notifications fetched', { notifications }))
}

export async function markNotificationAsReadController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  const notificationId = getNotificationIdParam(req)

  if (!notificationId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Notification id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const notification = await markNotificationAsReadService(
    req.user.id,
    req.user.role,
    notificationId,
  )

  if (!notification) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Notification not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Notification updated', notification))
}

export async function markAllNotificationsReadController(req: Request, res: Response) {
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(errorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED))
  }

  await markAllNotificationsReadService(req.user.id, req.user.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Notifications updated'))
}
