import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER' | 'MANAGER_USER' | 'SUB_ADMIN'

type NotificationListItem = {
  id: string
  taskId: string | null
  type: string
  title: string
  message: string
  isRead: boolean
  readAt: Date | null
  createdAt: Date
  task: {
    id: string
    title: string
    status: string
    priority: string
  } | null
}

export async function listNotificationsService(userId: string, role: CurrentUserRole | undefined) {
  if (!role) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const rows = await prisma.notification.findMany({
    where: {
      userId,
      isRead: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      taskId: true,
      type: true,
      title: true,
      message: true,
      isRead: true,
      readAt: true,
      createdAt: true,
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
        },
      },
    },
  })

  return rows as NotificationListItem[]
}

export async function markNotificationAsReadService(
  userId: string,
  role: CurrentUserRole | undefined,
  notificationId: string,
) {
  if (!role) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: {
      id: true,
    },
  })

  if (!notification) {
    return null
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

export async function markAllNotificationsReadService(
  userId: string,
  role: CurrentUserRole | undefined,
) {
  if (!role) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return true
}
