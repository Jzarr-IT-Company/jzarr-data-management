import { getUserAccessContext, isAdminRole, type CurrentUserRole } from './user.access.js'

export { isAdminRole, type CurrentUserRole } from './user.access.js'

export async function getAccessibleDepartmentIds(userId: string, role?: CurrentUserRole) {
  const accessContext = await getUserAccessContext(userId, role)

  if (isAdminRole(role)) {
    return null
  }

  return accessContext.accessibleDepartmentIds ?? []
}

export function buildLeadScopeWhere(accessibleDepartmentIds: string[] | null, createdById?: string) {
  if (!accessibleDepartmentIds && !createdById) {
    return {}
  }

  return {
    ...(accessibleDepartmentIds
      ? {
          departmentId: {
            in: accessibleDepartmentIds,
          },
        }
      : {}),
    ...(createdById ? { createdById } : {}),
  }
}
