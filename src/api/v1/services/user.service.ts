import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { hashPassword } from '../../../utils/auth.js'
import { AppError } from '../../../utils/app-error.js'
import {
  isPrismaUniqueConstraintError,
  normalizeDepartmentIds,
  toSafeManager,
  type ManagerRecord,
} from './user.helpers.js'

type ManagerDepartmentPayload = {
  name: string
  email: string
  password: string
  phone?: string | null
  designation?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  departmentIds: string[]
}

type UpdateManagerPayload = Partial<Omit<ManagerDepartmentPayload, 'password' | 'departmentIds'>> & {
  departmentIds?: string[]
}

const MANAGER_INCLUDE = {
  managedDepartments: true,
} as const

async function ensureActiveDepartments(departmentIds: string[]) {
  const departments = await prisma.department.findMany({
    where: {
      id: {
        in: departmentIds,
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  })

  if (departments.length !== departmentIds.length) {
    throw new AppError('One or more departments are invalid or inactive', HTTP_STATUS.BAD_REQUEST)
  }
}

async function findManagerById(managerId: string) {
  return prisma.user.findFirst({
    where: {
      id: managerId,
      role: 'MANAGER',
    },
    include: MANAGER_INCLUDE,
  })
}

function buildSafeManagerList(managers: ManagerRecord[]) {
  return managers.map(toSafeManager)
}

export async function listManagersService() {
  const managers = await prisma.user.findMany({
    where: {
      role: 'MANAGER',
    },
    include: MANAGER_INCLUDE,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return buildSafeManagerList(managers as ManagerRecord[])
}

export async function createManagerService(payload: ManagerDepartmentPayload) {
  const departmentIds = normalizeDepartmentIds(payload.departmentIds)

  if (!departmentIds.length) {
    throw new AppError('At least one department is required', HTTP_STATUS.BAD_REQUEST)
  }

  await ensureActiveDepartments(departmentIds)

  const passwordHash = await hashPassword(payload.password)

  try {
    const manager = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        passwordHash,
        role: 'MANAGER',
        status: payload.status ?? 'ACTIVE',
        phone: payload.phone?.trim() || undefined,
        designation: payload.designation?.trim() || undefined,
        managedDepartments: {
          connect: departmentIds.map((departmentId) => ({ id: departmentId })),
        },
      },
      include: MANAGER_INCLUDE,
    })

    return toSafeManager(manager as ManagerRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A manager with this email or phone already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function getManagerService(managerId: string) {
  const manager = await findManagerById(managerId)

  if (!manager) {
    return null
  }

  return toSafeManager(manager as ManagerRecord)
}

export async function updateManagerService(managerId: string, payload: UpdateManagerPayload) {
  const existingManager = await findManagerById(managerId)

  if (!existingManager) {
    return null
  }

  const departmentIds =
    payload.departmentIds === undefined ? undefined : normalizeDepartmentIds(payload.departmentIds)

  if (departmentIds !== undefined) {
    if (!departmentIds.length) {
      throw new AppError('At least one department is required', HTTP_STATUS.BAD_REQUEST)
    }

    await ensureActiveDepartments(departmentIds)
  }

  const updateData = {
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.email !== undefined ? { email: payload.email.trim().toLowerCase() } : {}),
    ...(payload.phone !== undefined
      ? { phone: payload.phone?.trim() ? payload.phone.trim() : null }
      : {}),
    ...(payload.designation !== undefined
      ? { designation: payload.designation?.trim() ? payload.designation.trim() : null }
      : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(departmentIds !== undefined
      ? {
          managedDepartments: {
            set: departmentIds.map((departmentId) => ({ id: departmentId })),
          },
        }
      : {}),
  }

  try {
    const manager = await prisma.user.update({
      where: {
        id: managerId,
      },
      data: updateData,
      include: MANAGER_INCLUDE,
    })

    return toSafeManager(manager as ManagerRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A manager with this email or phone already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function updateManagerStatusService(
  managerId: string,
  status: ManagerDepartmentPayload['status']
) {
  if (!status) {
    throw new AppError('Status is required', HTTP_STATUS.BAD_REQUEST)
  }

  return updateManagerService(managerId, { status })
}

export async function resetManagerPasswordService(managerId: string, password: string) {
  const manager = await findManagerById(managerId)

  if (!manager) {
    return null
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: {
      id: managerId,
    },
    data: {
      passwordHash,
    },
  })

  return toSafeManager(manager as ManagerRecord)
}

export async function deleteManagerService(managerId: string) {
  const manager = await findManagerById(managerId)

  if (!manager) {
    return null
  }

  const leadCount = await prisma.lead.count({
    where: {
      OR: [
        {
          createdById: managerId,
        },
        {
          updatedById: managerId,
        },
      ],
    },
  })

  if (leadCount > 0) {
    throw new AppError(
      'Manager has linked leads and cannot be deleted. Deactivate the account instead.',
      HTTP_STATUS.CONFLICT
    )
  }

  await prisma.user.delete({
    where: {
      id: managerId,
    },
  })

  return true
}

export { normalizeDepartmentIds }
