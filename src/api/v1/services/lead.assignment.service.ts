import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import type { CurrentUserRole } from './user.access.js'
import type { LeadAssignmentRecord } from './lead.helpers.js'
import { ensureLeadAccessService } from './lead.service.js'

type AssignableRole = 'SUB_ADMIN' | 'MANAGER' | 'MANAGER_USER'

type TargetUserRecord = {
  id: string
  role: AssignableRole
  status: 'ACTIVE' | 'INACTIVE'
  deletedAt: Date | null
  managerId: string | null
  managedDepartments: { id: string }[]
  manager: { managedDepartments: { id: string }[] } | null
}

type ActorRecord = {
  managedDepartments: { id: string }[]
}

async function fetchActor(userId: string): Promise<ActorRecord | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      managedDepartments: { select: { id: true } },
    },
  }) as Promise<ActorRecord | null>
}

// Roles each actor level is permitted to assign leads to
const ALLOWED_TARGET_ROLES: Record<string, AssignableRole[]> = {
  ADMIN:     ['SUB_ADMIN', 'MANAGER', 'MANAGER_USER'],
  SUB_ADMIN: ['MANAGER'],
  MANAGER:   ['MANAGER_USER'],
}

async function fetchTargetUser(userId: string): Promise<TargetUserRecord | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      role: true,
      status: true,
      deletedAt: true,
      managerId: true,
      managedDepartments: { select: { id: true } },
      manager: { select: { managedDepartments: { select: { id: true } } } },
    },
  }) as Promise<TargetUserRecord | null>
}


async function validateAssignmentTarget(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  targetUserId: string,
): Promise<TargetUserRecord> {
  const role = actorRole ?? 'MANAGER'
  const allowed = ALLOWED_TARGET_ROLES[role]

  if (!allowed) {
    throw new AppError('You do not have permission to assign leads', HTTP_STATUS.FORBIDDEN)
  }

  const targetUser = await fetchTargetUser(targetUserId)

  if (!targetUser || targetUser.status !== 'ACTIVE') {
    throw new AppError('Target user not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  if (!allowed.includes(targetUser.role)) {
    throw new AppError(
      `Cannot assign to a user with role ${targetUser.role}`,
      HTTP_STATUS.FORBIDDEN,
    )
  }

  // SUB_ADMIN → can only assign to managers in their departments
  if (role === 'SUB_ADMIN') {
    const actor = await fetchActor(actorId)
    if (!actor) throw new AppError('Actor not found', HTTP_STATUS.UNAUTHORIZED)

    const actorDeptIds = new Set(actor.managedDepartments.map((d) => d.id))
    const targetDeptIds = targetUser.managedDepartments.map((d) => d.id)
    const hasOverlap = targetDeptIds.some((id) => actorDeptIds.has(id))

    if (!hasOverlap) {
      throw new AppError('Target manager is not in your departments', HTTP_STATUS.FORBIDDEN)
    }
  }

  // MANAGER → can only assign to their own team users
  if (role === 'MANAGER') {
    if (targetUser.managerId !== actorId) {
      throw new AppError('Target user is not in your team', HTTP_STATUS.FORBIDDEN)
    }
  }

  return targetUser
}

function getTargetDepartmentIds(targetUser: TargetUserRecord) {
  if (targetUser.role === 'MANAGER_USER') {
    return targetUser.manager?.managedDepartments.map((department) => department.id) ?? []
  }

  return targetUser.managedDepartments.map((department) => department.id)
}

export async function assignLeadsService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  payload: { leadIds: string[]; assignToUserId: string; note?: string | null },
): Promise<{ assigned: number; skipped: number }> {
  const { leadIds, assignToUserId, note } = payload

  if (!leadIds || leadIds.length === 0) {
    throw new AppError('No leads provided', HTTP_STATUS.BAD_REQUEST)
  }

  // Cannot assign to yourself (prevents assignment loops)
  if (assignToUserId === actorId) {
    throw new AppError('Cannot assign leads to yourself', HTTP_STATUS.BAD_REQUEST)
  }

  const targetUser = await validateAssignmentTarget(actorId, actorRole, assignToUserId)
  const targetDepartmentIds = new Set(getTargetDepartmentIds(targetUser))

  let assignableWhere

  if (actorRole === 'ADMIN') {
    assignableWhere = { id: { in: leadIds } }
  } else if (actorRole === 'SUB_ADMIN') {
    const actor = await fetchActor(actorId)
    const actorDepartmentIds = actor?.managedDepartments.map((department) => department.id) ?? []

    assignableWhere = {
      id: { in: leadIds },
      departmentId: { in: actorDepartmentIds },
    }
  } else {
    assignableWhere = { id: { in: leadIds }, assignedToId: actorId }
  }

  const assignableLeads = await prisma.lead.findMany({
    where: assignableWhere,
    select: { id: true, departmentId: true },
  })

  const leadsInsideTargetScope = assignableLeads.filter((lead) =>
    targetDepartmentIds.has(lead.departmentId),
  )

  if (leadsInsideTargetScope.length === 0) {
    throw new AppError(
      'None of the selected leads are available for you to assign',
      HTTP_STATUS.FORBIDDEN,
    )
  }

  const assignableIds = leadsInsideTargetScope.map((lead) => lead.id)
  const skipped = leadIds.length - assignableIds.length

  await prisma.$transaction([
    prisma.lead.updateMany({
      where: { id: { in: assignableIds } },
      data: { assignedToId: assignToUserId },
    }),
    prisma.leadAssignment.createMany({
      data: assignableIds.map((leadId) => ({
        leadId,
        assignedToId: assignToUserId,
        assignedById: actorId,
        note: note ?? null,
      })),
    }),
  ])

  return { assigned: assignableIds.length, skipped }
}

export async function getLeadAssignmentsService(
  userId: string,
  role: CurrentUserRole | undefined,
  leadId: string,
  allowedScreens?: string[],
): Promise<LeadAssignmentRecord[]> {
  const lead = await ensureLeadAccessService(userId, role, leadId, allowedScreens)

  if (!lead) {
    throw new AppError('Lead not found', HTTP_STATUS.NOT_FOUND)
  }

  const assignments = await prisma.leadAssignment.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      leadId: true,
      assignedToId: true,
      assignedById: true,
      note: true,
      createdAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return assignments as LeadAssignmentRecord[]
}

// Returns all users the current actor is allowed to assign leads to
export async function getAssignableUsersService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const role = actorRole ?? 'MANAGER'

  if (role === 'MANAGER_USER') {
    return []
  }

  if (role === 'ADMIN') {
    return prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        role: { in: ['SUB_ADMIN', 'MANAGER', 'MANAGER_USER'] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
  }

  if (role === 'SUB_ADMIN') {
    // Sub admins can only assign to managers in their departments
    const actor = await fetchActor(actorId)
    if (!actor) return []
    const deptIds = actor.managedDepartments.map((d) => d.id)

    return prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        role: 'MANAGER',
        managedDepartments: { some: { id: { in: deptIds } } },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
  }

  // MANAGER → their own team users
  return prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      role: 'MANAGER_USER',
      managerId: actorId,
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
}
