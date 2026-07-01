import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import { emitNotificationCreatedEvent } from '../../../socket/task-socket.js'
import type { CurrentUserRole } from './user.access.js'

async function notifyTargetAssigned(
  recipientId: string,
  title: string,
  targetValue: number,
): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'TARGET',
        title: 'New target assigned',
        message: `You have a new target: "${title}" — PKR ${targetValue.toLocaleString()}.`,
      },
      select: {
        id: true,
        taskId: true,
        leadId: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    })

    emitNotificationCreatedEvent(notification, recipientId)
  } catch (err) {
    // Notification failure should never block target creation
    console.error('[Target] Failed to notify recipient:', err)
  }
}

export type TargetPeriodValue = 'WEEKLY' | 'MONTHLY' | 'SIX_MONTH' | 'YEARLY'

export type TargetPayload = {
  assignedToId: string
  title: string
  description?: string | null
  period: TargetPeriodValue
  targetValue: number // PKR amount
  periodStart: string // ISO date string
  periodEnd: string
  notes?: string | null
}

type TargetRecord = {
  id: string
  assignedToId: string
  assignedById: string
  title: string
  description: string | null
  period: TargetPeriodValue
  targetValue: number
  periodStart: Date
  periodEnd: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
  assignedTo: { id: string; name: string; email: string; role: string }
  assignedBy: { id: string; name: string; email: string }
}

const TARGET_SELECT = {
  id: true,
  assignedToId: true,
  assignedById: true,
  title: true,
  description: true,
  period: true,
  targetValue: true,
  periodStart: true,
  periodEnd: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  assignedBy: { select: { id: true, name: true, email: true } },
} as const

// Targets cascade strictly one level down the hierarchy:
//   Admin -> Sub Admin, Sub Admin -> Manager, Manager -> Agent
const ALLOWED_TARGET_ROLES: Record<string, string[]> = {
  ADMIN:     ['SUB_ADMIN'],
  SUB_ADMIN: ['MANAGER'],
  MANAGER:   ['MANAGER_USER'],
}

async function validateTargetRecipient(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  recipientId: string,
): Promise<void> {
  const role = actorRole ?? 'MANAGER'
  const allowed = ALLOWED_TARGET_ROLES[role]

  if (!allowed) {
    throw new AppError('You do not have permission to create targets', HTTP_STATUS.FORBIDDEN)
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: {
      id: true,
      role: true,
      status: true,
      managerId: true,
      managedDepartments: { select: { id: true } },
    },
  })

  if (!recipient || recipient.status !== 'ACTIVE') {
    throw new AppError('Target recipient not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  if (!allowed.includes(recipient.role)) {
    throw new AppError(
      `Cannot assign targets to a user with role ${recipient.role}`,
      HTTP_STATUS.FORBIDDEN,
    )
  }

  // SUB_ADMIN → only managers in their departments
  if (role === 'SUB_ADMIN') {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { managedDepartments: { select: { id: true } } },
    })
    if (!actor) throw new AppError('Actor not found', HTTP_STATUS.UNAUTHORIZED)

    const actorDeptIds = new Set(actor.managedDepartments.map((d) => d.id))
    const recipientDeptIds = (recipient as { managedDepartments: { id: string }[] }).managedDepartments.map((d) => d.id)
    const hasOverlap = recipientDeptIds.some((id) => actorDeptIds.has(id))

    if (!hasOverlap) {
      throw new AppError('Recipient is not in your departments', HTTP_STATUS.FORBIDDEN)
    }
  }

  // MANAGER → only their own team members
  if (role === 'MANAGER') {
    if ((recipient as { managerId: string | null }).managerId !== actorId) {
      throw new AppError('Recipient is not in your team', HTTP_STATUS.FORBIDDEN)
    }
  }
}

// Achievement is the PKR amount collected (via lead receipts) on leads
// assigned to the user during the target period.
export async function calculateTargetProgress(
  target: Pick<TargetRecord, 'assignedToId' | 'targetValue' | 'periodStart' | 'periodEnd'>,
): Promise<{ achieved: number; targetValue: number; percentage: number }> {
  const { assignedToId, targetValue, periodStart, periodEnd } = target

  const result = await prisma.leadReceipt.aggregate({
    _sum: { amount: true },
    where: {
      lead: { assignedToId },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  })

  const achieved = Number(result._sum.amount ?? 0)
  const percentage = targetValue > 0 ? Math.min(Math.round((achieved / targetValue) * 100), 100) : 0

  return { achieved, targetValue, percentage }
}

export async function createTargetService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  payload: TargetPayload,
) {
  await validateTargetRecipient(actorId, actorRole, payload.assignedToId)

  const start = new Date(payload.periodStart)
  const end = new Date(payload.periodEnd)

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new AppError('Invalid period dates', HTTP_STATUS.BAD_REQUEST)
  }

  if (payload.targetValue <= 0) {
    throw new AppError('Target value must be greater than zero', HTTP_STATUS.BAD_REQUEST)
  }

  const target = await prisma.target.create({
    data: {
      assignedToId: payload.assignedToId,
      assignedById: actorId,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? null,
      period: payload.period,
      targetValue: payload.targetValue,
      periodStart: start,
      periodEnd: end,
      notes: payload.notes?.trim() ?? null,
    },
    select: TARGET_SELECT,
  })

  await notifyTargetAssigned(payload.assignedToId, target.title, target.targetValue)

  const progress = await calculateTargetProgress(target as TargetRecord)

  return { ...target, progress }
}

export async function updateTargetService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  targetId: string,
  payload: Partial<TargetPayload>,
) {
  const existing = await prisma.target.findUnique({
    where: { id: targetId },
    select: {
      assignedById: true,
      periodStart: true,
      periodEnd: true,
    },
  })

  if (!existing) {
    throw new AppError('Target not found', HTTP_STATUS.NOT_FOUND)
  }

  // Only the creator or admin can edit
  if (actorRole !== 'ADMIN' && existing.assignedById !== actorId) {
    throw new AppError('You can only edit targets you created', HTTP_STATUS.FORBIDDEN)
  }

  const updateData: Record<string, unknown> = {}
  const nextPeriodStart =
    payload.periodStart !== undefined ? new Date(payload.periodStart) : existing.periodStart
  const nextPeriodEnd =
    payload.periodEnd !== undefined ? new Date(payload.periodEnd) : existing.periodEnd

  if (
    isNaN(nextPeriodStart.getTime()) ||
    isNaN(nextPeriodEnd.getTime()) ||
    nextPeriodEnd <= nextPeriodStart
  ) {
    throw new AppError('Invalid period dates', HTTP_STATUS.BAD_REQUEST)
  }

  if (payload.targetValue !== undefined && payload.targetValue <= 0) {
    throw new AppError('Target value must be greater than zero', HTTP_STATUS.BAD_REQUEST)
  }

  if (payload.title !== undefined) updateData.title = payload.title.trim()
  if (payload.description !== undefined) updateData.description = payload.description?.trim() ?? null
  if (payload.period !== undefined) updateData.period = payload.period
  if (payload.targetValue !== undefined) updateData.targetValue = payload.targetValue
  if (payload.notes !== undefined) updateData.notes = payload.notes?.trim() ?? null
  if (payload.periodStart !== undefined) updateData.periodStart = nextPeriodStart
  if (payload.periodEnd !== undefined) updateData.periodEnd = nextPeriodEnd

  const updated = await prisma.target.update({
    where: { id: targetId },
    data: updateData,
    select: TARGET_SELECT,
  })

  const progress = await calculateTargetProgress(updated as TargetRecord)

  return { ...updated, progress }
}

export async function deleteTargetService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  targetId: string,
): Promise<void> {
  const existing = await prisma.target.findUnique({
    where: { id: targetId },
    select: { assignedById: true },
  })

  if (!existing) {
    throw new AppError('Target not found', HTTP_STATUS.NOT_FOUND)
  }

  if (actorRole !== 'ADMIN' && existing.assignedById !== actorId) {
    throw new AppError('You can only delete targets you created', HTTP_STATUS.FORBIDDEN)
  }

  await prisma.target.delete({ where: { id: targetId } })
}

// Targets assigned TO me (with progress)
export async function listMyTargetsService(userId: string) {
  const targets = await prisma.target.findMany({
    where: { assignedToId: userId },
    orderBy: { periodEnd: 'desc' },
    select: TARGET_SELECT,
  })

  return Promise.all(
    targets.map(async (t) => {
      const progress = await calculateTargetProgress(t as TargetRecord)
      return { ...t, progress }
    }),
  )
}

// Targets I gave to others (with their progress)
export async function listGivenTargetsService(userId: string) {
  const targets = await prisma.target.findMany({
    where: { assignedById: userId },
    orderBy: { createdAt: 'desc' },
    select: TARGET_SELECT,
  })

  return Promise.all(
    targets.map(async (t) => {
      const progress = await calculateTargetProgress(t as TargetRecord)
      return { ...t, progress }
    }),
  )
}

// Full target detail with progress
export async function getTargetService(
  userId: string,
  role: CurrentUserRole | undefined,
  targetId: string,
) {
  const target = await prisma.target.findUnique({
    where: { id: targetId },
    select: TARGET_SELECT,
  })

  if (!target) {
    throw new AppError('Target not found', HTTP_STATUS.NOT_FOUND)
  }

  if (role !== 'ADMIN' && target.assignedToId !== userId && target.assignedById !== userId) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  const progress = await calculateTargetProgress(target as TargetRecord)

  return { ...target, progress }
}

// Users the actor can assign targets to — strictly one level down the hierarchy.
// Admin -> Sub Admins, Sub Admin -> Managers (in dept), Manager -> their agents.
export async function getTargetAssignableUsersService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const role = actorRole ?? 'MANAGER'

  if (role === 'ADMIN') {
    return prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'SUB_ADMIN' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
  }

  if (role === 'SUB_ADMIN') {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { managedDepartments: { select: { id: true } } },
    })
    if (!actor) return []
    const deptIds = actor.managedDepartments.map((d) => d.id)

    return prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'MANAGER',
        managedDepartments: { some: { id: { in: deptIds } } },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
  }

  if (role === 'MANAGER') {
    return prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'MANAGER_USER', managerId: actorId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
  }

  return []
}
