import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'

export type CurrentUserRole = 'ADMIN' | 'MANAGER' | 'MANAGER_USER' | 'SUB_ADMIN'

export type UserAccessContext = {
  accessibleDepartmentIds: string[] | null
  ownLeadOnly: boolean
}

type DepartmentAccessRecord = {
  id: string
}

type ManagerAccessRecord = {
  id: string
  status: 'ACTIVE' | 'INACTIVE'
  managedDepartments: DepartmentAccessRecord[]
}

type UserAccessRecord = {
  status: 'ACTIVE' | 'INACTIVE'
  managedDepartments: DepartmentAccessRecord[]
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
      managedDepartments: {
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
      ownLeadOnly: false,
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
      ownLeadOnly: true,
    }
  }

  return {
    accessibleDepartmentIds: user.managedDepartments.map((department) => department.id),
    ownLeadOnly: false,
  }
}
