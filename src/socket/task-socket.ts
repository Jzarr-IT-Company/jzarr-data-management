import type { Server as HttpServer } from 'node:http'

import { Server } from 'socket.io'

import { corsConfig } from '../config/cors.js'
import { verifyAccessToken } from '../utils/auth.js'
import type { UserRole } from '../types/user-role.js'

type TaskSocketEvent = {
  action: 'assigned' | 'status-updated' | 'deleted'
  taskId: string
  title: string
  message: string
  managerId?: string
  departmentId?: string
}

type NotificationSocketEvent = {
  id: string
  taskId: string | null
  leadId: string | null
  type: string
  title: string
  message: string
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

type ConnectedUser = {
  id: string
  role: UserRole
  email: string
  name: string
}

let io: Server | null = null

export function initializeTaskSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: corsConfig.allowedOrigins,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token
    const headerToken = socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.slice(7)
      : undefined
    const token = typeof authToken === 'string' && authToken.trim() ? authToken : headerToken

    if (!token) {
      next(new Error('Unauthorized'))
      return
    }

    try {
      socket.data.user = verifyAccessToken(token) as ConnectedUser
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as ConnectedUser | undefined

    if (!user) {
      socket.disconnect(true)
      return
    }

    socket.join(`user:${user.id}`)
    socket.join(`role:${user.role}`)
  })

  return io
}

function emitToRoom(room: string, event: string, payload: TaskSocketEvent) {
  io?.to(room).emit(event, payload)
}

function emitNotificationToRoom(room: string, payload: NotificationSocketEvent) {
  io?.to(room).emit('notification:event', payload)
}

export function emitTaskCreatedEvent(
  task: TaskSocketEvent,
  managerId: string,
  adminIds: string[] = [],
) {
  emitToRoom(`user:${managerId}`, 'task:event', task)
  emitToRoom('role:ADMIN', 'task:event', task)

  adminIds.forEach((adminId) => {
    emitToRoom(`user:${adminId}`, 'task:event', task)
  })
}

export function emitTaskStatusEvent(task: TaskSocketEvent, managerId: string) {
  emitToRoom(`user:${managerId}`, 'task:event', task)
  emitToRoom('role:ADMIN', 'task:event', task)
}

export function emitTaskDeletedEvent(task: TaskSocketEvent, managerId: string) {
  emitToRoom(`user:${managerId}`, 'task:event', task)
  emitToRoom('role:ADMIN', 'task:event', task)
}

export function emitNotificationCreatedEvent(
  notification: NotificationSocketEvent,
  recipientId: string,
) {
  emitNotificationToRoom(`user:${recipientId}`, notification)
}
