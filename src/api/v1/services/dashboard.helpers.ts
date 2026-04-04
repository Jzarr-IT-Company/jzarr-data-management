import { prisma } from '../../../lib/prisma.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER'

export async function getAccessibleDepartmentIds(userId: string, role?: CurrentUserRole) {
  if (role === 'ADMIN') {
    return null
  }

  const user = await prisma.user.findUnique({
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
    },
  })

  if (!user || user.status !== 'ACTIVE') {
    return []
  }

  return user.managedDepartments.map((department: { id: string }) => department.id)
}

export function isAdminRole(role?: CurrentUserRole) {
  return role === 'ADMIN'
}

export function buildLeadScopeWhere(accessibleDepartmentIds: string[] | null) {
  if (!accessibleDepartmentIds) {
    return {}
  }

  return {
    departmentId: {
      in: accessibleDepartmentIds,
    },
  }
}
