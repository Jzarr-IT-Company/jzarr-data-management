import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import {
  isPrismaUniqueConstraintError,
  normalizeDepartmentAccent,
  normalizeDepartmentCode,
  normalizeDepartmentName,
  toSafeDepartment,
  type DepartmentRecord,
} from './department.helpers.js'

type DepartmentPayload = {
  name: string
  code: string
  accent: string
  isActive?: boolean
}

type UpdateDepartmentPayload = Partial<DepartmentPayload>

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  code: true,
  accent: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      managers: true,
      leads: true,
    },
  },
} as const

function assertDepartmentExists<T>(department: T | null) {
  if (!department) {
    return null
  }

  return department
}

async function findDepartmentById(departmentId: string): Promise<DepartmentRecord | null> {
  return prisma.department.findUnique({
    where: {
      id: departmentId,
    },
    select: DEPARTMENT_SELECT,
  })
}

function isAdmin(role?: string) {
  return role === 'ADMIN'
}

export async function listDepartmentsService(role?: string) {
  const departments = await prisma.department.findMany({
    where: isAdmin(role) ? undefined : { isActive: true },
    orderBy: [
      {
        isActive: 'desc',
      },
      {
        name: 'asc',
      },
    ],
    select: DEPARTMENT_SELECT,
  })

  return departments.map((department: DepartmentRecord) => toSafeDepartment(department))
}

export async function getDepartmentService(departmentId: string, role?: string) {
  const department = await findDepartmentById(departmentId)

  if (!department) {
    return null
  }

  if (!isAdmin(role) && !department.isActive) {
    return null
  }

  return toSafeDepartment(department as DepartmentRecord)
}

export async function createDepartmentService(payload: DepartmentPayload) {
  try {
    const department = await prisma.department.create({
      data: {
        name: normalizeDepartmentName(payload.name),
        code: normalizeDepartmentCode(payload.code),
        accent: normalizeDepartmentAccent(payload.accent),
        isActive: payload.isActive ?? true,
      },
      select: DEPARTMENT_SELECT,
    })

    return toSafeDepartment(department as DepartmentRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A department with this name or code already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function updateDepartmentService(
  departmentId: string,
  payload: UpdateDepartmentPayload
) {
  const existingDepartment = await findDepartmentById(departmentId)

  if (!assertDepartmentExists(existingDepartment)) {
    return null
  }

  try {
    const department = await prisma.department.update({
      where: {
        id: departmentId,
      },
      data: {
        ...(payload.name !== undefined ? { name: normalizeDepartmentName(payload.name) } : {}),
        ...(payload.code !== undefined ? { code: normalizeDepartmentCode(payload.code) } : {}),
        ...(payload.accent !== undefined
          ? { accent: normalizeDepartmentAccent(payload.accent) }
          : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      select: DEPARTMENT_SELECT,
    })

    return toSafeDepartment(department as DepartmentRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A department with this name or code already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function updateDepartmentStatusService(departmentId: string, isActive: boolean) {
  return updateDepartmentService(departmentId, { isActive })
}

export async function deleteDepartmentService(departmentId: string) {
  const department = await findDepartmentById(departmentId)

  if (!department) {
    return null
  }

  if (department._count.leads > 0) {
    throw new AppError(
      'Department has linked leads and cannot be deleted. Deactivate the department instead.',
      HTTP_STATUS.CONFLICT
    )
  }

  await prisma.department.delete({
    where: {
      id: departmentId,
    },
  })

  return true
}
