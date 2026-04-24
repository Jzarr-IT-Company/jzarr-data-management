import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { hashPassword } from '../../../utils/auth.js'
import { AppError } from '../../../utils/app-error.js'
import {
  isPrismaUniqueConstraintError,
  normalizeDepartmentIds,
  MANAGER_USER_DEFAULT_SCREENS,
  type ManagerUserRecord,
  toSafeSubAdmin,
  toSafeManager,
  type ManagerRecord,
  type SubAdminRecord,
  SUB_ADMIN_SCREEN_OPTIONS,
  toSafeManagerUser,
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

type ManagerUserPayload = {
  name: string
  email: string
  password: string
  phone?: string | null
  designation?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
}

type UpdateManagerUserPayload = Partial<Omit<ManagerUserPayload, 'password'>>

type SubAdminPayload = ManagerDepartmentPayload & {
  allowedScreens: string[]
}

type UpdateManagerPayload = Partial<Omit<ManagerDepartmentPayload, 'password' | 'departmentIds'>> & {
  departmentIds?: string[]
}

type UpdateSubAdminPayload = Partial<
  Omit<SubAdminPayload, 'password' | 'departmentIds' | 'allowedScreens'>
> & {
  departmentIds?: string[]
  allowedScreens?: string[]
}

const MANAGER_INCLUDE = {
  managedDepartments: true,
  _count: {
    select: {
      teamUsers: true,
    },
  },
} as const

const SUB_ADMIN_INCLUDE = {
  managedDepartments: true,
} as const

const MANAGER_USER_INCLUDE = {
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      managedDepartments: {
        select: {
          id: true,
          name: true,
          code: true,
          accent: true,
          isActive: true,
        },
      },
    },
  },
} as const

function normalizeScreens(screens: string[]) {
  return Array.from(
    new Set(
      screens
        .map((screen) => screen.trim())
        .filter((screen) => SUB_ADMIN_SCREEN_OPTIONS.includes(screen as (typeof SUB_ADMIN_SCREEN_OPTIONS)[number])),
    ),
  ) as (typeof SUB_ADMIN_SCREEN_OPTIONS)[number][]
}

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

async function findManagerUserById(managerId: string, managerUserId: string) {
  return prisma.user.findFirst({
    where: {
      id: managerUserId,
      role: 'MANAGER_USER',
      managerId,
    },
    include: MANAGER_USER_INCLUDE,
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

  return buildSafeManagerList(
    managers.map((manager) => ({
      ...(manager as ManagerRecord),
      teamUserCount: manager._count?.teamUsers ?? 0,
    })),
  )
}

function buildSafeSubAdminList(subAdmins: SubAdminRecord[]) {
  return subAdmins.map((subAdmin) => toSafeSubAdmin(subAdmin))
}

function buildSafeManagerUserList(managerUsers: ManagerUserRecord[]) {
  return managerUsers.map((managerUser) => toSafeManagerUser(managerUser))
}

async function findSubAdminById(subAdminId: string) {
  return prisma.user.findFirst({
    where: {
      id: subAdminId,
      role: 'SUB_ADMIN',
    },
    include: SUB_ADMIN_INCLUDE,
  })
}

export async function listSubAdminsService() {
  const subAdmins = await prisma.user.findMany({
    where: {
      role: 'SUB_ADMIN',
    },
    include: SUB_ADMIN_INCLUDE,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return buildSafeSubAdminList(subAdmins as SubAdminRecord[])
}

export async function createSubAdminService(payload: SubAdminPayload) {
  const departmentIds = normalizeDepartmentIds(payload.departmentIds)

  if (!departmentIds.length) {
    throw new AppError('At least one department is required', HTTP_STATUS.BAD_REQUEST)
  }

  const allowedScreens = normalizeScreens(payload.allowedScreens)

  if (!allowedScreens.length) {
    throw new AppError('At least one screen is required', HTTP_STATUS.BAD_REQUEST)
  }

  await ensureActiveDepartments(departmentIds)

  const passwordHash = await hashPassword(payload.password)

  try {
    const subAdmin = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        passwordHash,
        role: 'SUB_ADMIN',
        status: payload.status ?? 'ACTIVE',
        phone: payload.phone?.trim() || undefined,
        designation: payload.designation?.trim() || undefined,
        allowedScreens,
        managedDepartments: {
          connect: departmentIds.map((departmentId) => ({ id: departmentId })),
        },
      },
      include: SUB_ADMIN_INCLUDE,
    })

    return toSafeSubAdmin(subAdmin as SubAdminRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A sub admin with this email or phone already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function getSubAdminService(subAdminId: string) {
  const subAdmin = await findSubAdminById(subAdminId)

  if (!subAdmin) {
    return null
  }

  return toSafeSubAdmin(subAdmin as SubAdminRecord)
}

export async function updateSubAdminService(subAdminId: string, payload: UpdateSubAdminPayload) {
  const existingSubAdmin = await findSubAdminById(subAdminId)

  if (!existingSubAdmin) {
    return null
  }

  const departmentIds =
    payload.departmentIds === undefined ? undefined : normalizeDepartmentIds(payload.departmentIds)
  const allowedScreens =
    payload.allowedScreens === undefined ? undefined : normalizeScreens(payload.allowedScreens)

  if (departmentIds !== undefined) {
    if (!departmentIds.length) {
      throw new AppError('At least one department is required', HTTP_STATUS.BAD_REQUEST)
    }

    await ensureActiveDepartments(departmentIds)
  }

  if (allowedScreens !== undefined && !allowedScreens.length) {
    throw new AppError('At least one screen is required', HTTP_STATUS.BAD_REQUEST)
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
    ...(allowedScreens !== undefined ? { allowedScreens } : {}),
    ...(departmentIds !== undefined
      ? {
          managedDepartments: {
            set: departmentIds.map((departmentId) => ({ id: departmentId })),
          },
        }
      : {}),
  }

  try {
    const subAdmin = await prisma.user.update({
      where: {
        id: subAdminId,
      },
      data: updateData,
      include: SUB_ADMIN_INCLUDE,
    })

    return toSafeSubAdmin(subAdmin as SubAdminRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A sub admin with this email or phone already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function updateSubAdminStatusService(
  subAdminId: string,
  status: SubAdminPayload['status']
) {
  if (!status) {
    throw new AppError('Status is required', HTTP_STATUS.BAD_REQUEST)
  }

  return updateSubAdminService(subAdminId, { status })
}

export async function resetSubAdminPasswordService(subAdminId: string, password: string) {
  const subAdmin = await findSubAdminById(subAdminId)

  if (!subAdmin) {
    return null
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: {
      id: subAdminId,
    },
    data: {
      passwordHash,
    },
  })

  return toSafeSubAdmin(subAdmin as SubAdminRecord)
}

export async function deleteSubAdminService(subAdminId: string) {
  const subAdmin = await findSubAdminById(subAdminId)

  if (!subAdmin) {
    return null
  }

  const leadCount = await prisma.lead.count({
    where: {
      OR: [
        {
          createdById: subAdminId,
        },
        {
          updatedById: subAdminId,
        },
      ],
    },
  })

  if (leadCount > 0) {
    throw new AppError(
      'Sub admin has linked leads and cannot be deleted. Deactivate the account instead.',
      HTTP_STATUS.CONFLICT
    )
  }

  await prisma.user.delete({
    where: {
      id: subAdminId,
    },
  })

  return true
}

export async function listManagerUsersService(managerId: string) {
  const managerUsers = await prisma.user.findMany({
    where: {
      role: 'MANAGER_USER',
      managerId,
    },
    include: MANAGER_USER_INCLUDE,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return buildSafeManagerUserList(managerUsers as ManagerUserRecord[])
}

export async function createManagerUserService(
  managerId: string,
  payload: ManagerUserPayload
) {
  const manager = await findManagerById(managerId)

  if (!manager) {
    return null
  }

  const passwordHash = await hashPassword(payload.password)

  try {
    const managerUser = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        passwordHash,
        role: 'MANAGER_USER',
        status: payload.status ?? 'ACTIVE',
        phone: payload.phone?.trim() || undefined,
        designation: payload.designation?.trim() || undefined,
        allowedScreens: Array.from(MANAGER_USER_DEFAULT_SCREENS),
        manager: {
          connect: {
            id: managerId,
          },
        },
      },
      include: MANAGER_USER_INCLUDE,
    })

    return toSafeManagerUser(managerUser as ManagerUserRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A manager user with this email or phone already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function getManagerUserService(managerId: string, managerUserId: string) {
  const managerUser = await findManagerUserById(managerId, managerUserId)

  if (!managerUser) {
    return null
  }

  return toSafeManagerUser(managerUser as ManagerUserRecord)
}

export async function updateManagerUserService(
  managerId: string,
  managerUserId: string,
  payload: UpdateManagerUserPayload
) {
  const existingManagerUser = await findManagerUserById(managerId, managerUserId)

  if (!existingManagerUser) {
    return null
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
  }

  try {
    const managerUser = await prisma.user.update({
      where: {
        id: managerUserId,
      },
      data: updateData,
      include: MANAGER_USER_INCLUDE,
    })

    return toSafeManagerUser(managerUser as ManagerUserRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(
        'A manager user with this email or phone already exists',
        HTTP_STATUS.CONFLICT
      )
    }

    throw error
  }
}

export async function updateManagerUserStatusService(
  managerId: string,
  managerUserId: string,
  status: ManagerUserPayload['status']
) {
  if (!status) {
    throw new AppError('Status is required', HTTP_STATUS.BAD_REQUEST)
  }

  return updateManagerUserService(managerId, managerUserId, { status })
}

export async function resetManagerUserPasswordService(
  managerId: string,
  managerUserId: string,
  password: string
) {
  const managerUser = await findManagerUserById(managerId, managerUserId)

  if (!managerUser) {
    return null
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: {
      id: managerUserId,
    },
    data: {
      passwordHash,
    },
  })

  return toSafeManagerUser(managerUser as ManagerUserRecord)
}

export async function deleteManagerUserService(managerId: string, managerUserId: string) {
  const managerUser = await findManagerUserById(managerId, managerUserId)

  if (!managerUser) {
    return null
  }

  const leadCount = await prisma.lead.count({
    where: {
      OR: [
        {
          createdById: managerUserId,
        },
        {
          updatedById: managerUserId,
        },
      ],
    },
  })

  if (leadCount > 0) {
    throw new AppError(
      'Manager user has linked leads and cannot be deleted. Deactivate the account instead.',
      HTTP_STATUS.CONFLICT
    )
  }

  await prisma.user.delete({
    where: {
      id: managerUserId,
    },
  })

  return true
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
