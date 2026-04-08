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
  role: 'ADMIN' | 'MANAGER' | 'SUB_ADMIN'
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

export const SUB_ADMIN_SCREEN_OPTIONS = [
  'dashboard',
  'departments',
  'reports',
  'tasks',
  'managers',
  'department-setup',
  'import-export',
  'sub-admins',
] as const

export type SubAdminScreen = (typeof SUB_ADMIN_SCREEN_OPTIONS)[number]

export type SubAdminRecord = {
  id: string
  name: string
  email: string
  role: 'SUB_ADMIN'
  status: 'ACTIVE' | 'INACTIVE'
  phone: string | null
  designation: string | null
  createdAt: Date
  updatedAt: Date
  managedDepartments: DepartmentSummary[]
  allowedScreens: unknown
}

export type SafeSubAdmin = {
  id: string
  name: string
  email: string
  role: 'sub_admin'
  status: 'active' | 'inactive'
  phone: string | null
  designation: string | null
  createdAt: Date
  updatedAt: Date
  departments: DepartmentSummary[]
  allowedScreens: SubAdminScreen[]
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

export function normalizeAllowedScreens(value: unknown): SubAdminScreen[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((screen) => String(screen || '').trim())
    .filter((screen): screen is SubAdminScreen =>
      (SUB_ADMIN_SCREEN_OPTIONS as readonly string[]).includes(screen),
    )
}

export function toSafeSubAdmin(user: SubAdminRecord): SafeSubAdmin {
  const { id, name, email, status, phone, designation, createdAt, updatedAt } = user

  return {
    id,
    name,
    email,
    role: 'sub_admin',
    status: status === 'ACTIVE' ? 'active' : 'inactive',
    phone,
    designation,
    createdAt,
    updatedAt,
    departments: user.managedDepartments,
    allowedScreens: normalizeAllowedScreens(user.allowedScreens),
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
