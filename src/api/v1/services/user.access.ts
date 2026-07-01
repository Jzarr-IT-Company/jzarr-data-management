import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'

export type CurrentUserRole = 'ADMIN' | 'MANAGER' | 'MANAGER_USER' | 'SUB_ADMIN'

export type UserAccessContext = {
  accessibleDepartmentIds: string[] | null
  // null = no user filter; otherwise visible leads must be created by or assigned to these user IDs.
  accessibleCreatorIds: string[] | null
}

type DepartmentAccessRecord = {
  id: string
}

type TeamUserRecord = {
  id: string
}

type ManagerAccessRecord = {
  id: string
  status: 'ACTIVE' | 'INACTIVE'
  managedDepartments: DepartmentAccessRecord[]
}

type UserAccessRecord = {
  status: 'ACTIVE' | 'INACTIVE'
  designation: string | null
  managedDepartments: DepartmentAccessRecord[]
  teamUsers: TeamUserRecord[]
  manager: ManagerAccessRecord | null
}

export function isAdminRole(role?: CurrentUserRole) {
  return role === 'ADMIN'
}

async function findUserAccessRecord(userId: string): Promise<UserAccessRecord | null> {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      status: true,
      designation: true,
      managedDepartments: {
        select: {
          id: true,
        },
      },
      teamUsers: {
        select: {
          id: true,
        },
      },
      manager: {
        select: {
          id: true,
          status: true,
          managedDepartments: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  }) as Promise<UserAccessRecord | null>
}

export async function getUserAccessContext(
  userId: string,
  role?: CurrentUserRole
): Promise<UserAccessContext> {
  if (isAdminRole(role)) {
    return {
      accessibleDepartmentIds: null,
      accessibleCreatorIds: null,
    }
  }

  const user = await findUserAccessRecord(userId)

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  if (role === 'MANAGER_USER') {
    const manager = user.manager

    if (!manager || manager.status !== 'ACTIVE') {
      throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
    }

    return {
      accessibleDepartmentIds: manager.managedDepartments.map((department) => department.id),
      accessibleCreatorIds: [userId],
    }
  }

  // Sub admins see all leads in their assigned departments (no creator restriction)
  if (role === 'SUB_ADMIN') {
    return {
      accessibleDepartmentIds: user.managedDepartments.map((department) => department.id),
      accessibleCreatorIds: null,
    }
  }

  // Project Manager sees all leads in their departments (no creator restriction)
  const isProjectManager =
    (user.designation || '').toLowerCase() === 'project manager'

  if (isProjectManager) {
    return {
      accessibleDepartmentIds: user.managedDepartments.map((department) => department.id),
      accessibleCreatorIds: null,
    }
  }

  // Regular manager sees their own leads and leads created by their team users
  const teamUserIds = user.teamUsers.map((u) => u.id)

  return {
    accessibleDepartmentIds: user.managedDepartments.map((department) => department.id),
    accessibleCreatorIds: [userId, ...teamUserIds],
  }
}
