type DepartmentSummary = {
  id: string
  name: string
  code: string
  accent: string
  isActive: boolean
}

export type ManagerRecord = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER'
  status: 'ACTIVE' | 'INACTIVE'
  phone: string | null
  designation: string | null
  createdAt: Date
  updatedAt: Date
  managedDepartments: DepartmentSummary[]
}

export type SafeManager = {
  id: string
  name: string
  email: string
  role: ManagerRecord['role']
  status: ManagerRecord['status']
  phone: string | null
  designation: string | null
  createdAt: Date
  updatedAt: Date
  departments: DepartmentSummary[]
}

export function toSafeManager(user: ManagerRecord): SafeManager {
  const { id, name, email, role, status, phone, designation, createdAt, updatedAt } = user

  return {
    id,
    name,
    email,
    role,
    status,
    phone,
    designation,
    createdAt,
    updatedAt,
    departments: user.managedDepartments,
  }
}

export function normalizeDepartmentIds(departmentIds: string[]) {
  return Array.from(
    new Set(
      departmentIds
        .map((departmentId) => departmentId.trim())
        .filter((departmentId) => departmentId.length > 0)
    )
  )
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )
}
