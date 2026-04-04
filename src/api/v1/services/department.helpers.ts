export type DepartmentRecord = {
  id: string
  name: string
  code: string
  accent: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    managers: number
    leads: number
  }
}

export function toSafeDepartment(department: DepartmentRecord) {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    accent: department.accent,
    isActive: department.isActive,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    managerCount: department._count.managers,
    leadCount: department._count.leads,
  }
}

export function normalizeDepartmentCode(code: string) {
  return code.trim().toUpperCase()
}

export function normalizeDepartmentName(name: string) {
  return name.trim()
}

export function normalizeDepartmentAccent(accent: string) {
  return accent.trim().toLowerCase()
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )
}
