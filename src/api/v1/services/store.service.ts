import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import {
  buildStoreReportCsv,
  buildStoreReportPdf,
  isPrismaUniqueConstraintError,
  normalizeStoreDate,
  normalizeStoreName,
  normalizeStoreUrl,
  storeReportRangeValues,
  toSafeStore,
  toSafeStoreStat,
  toStoreReportPayload,
  type SafeStore,
  type StoreRecord,
  type StoreReportRange,
} from './store.helpers.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER'

type StoreListQuery = {
  departmentId?: string
}

type StorePayload = {
  name: string
  url: string
  departmentId: string
  isActive?: boolean
}

type UpdateStorePayload = Partial<StorePayload>

type StoreStatPayload = {
  statDate: string
  views: number
  visitors: number
  orders: number
  revenue: number
}

type StoreStatRecord = {
  id: string
  statDate: Date
  views: number
  visitors: number
  orders: number
  revenue: unknown
  createdAt: Date
  updatedAt: Date
  createdBy: { id: string; name: string } | null
  updatedBy: { id: string; name: string } | null
}

type StoreModelClient = {
  findUnique: (...args: any[]) => Promise<StoreRecord | null>
  findMany: (...args: any[]) => Promise<StoreRecord[]>
  create: (...args: any[]) => Promise<StoreRecord>
  update: (...args: any[]) => Promise<StoreRecord>
  delete: (...args: any[]) => Promise<StoreRecord | null>
}

type StoreStatModelClient = {
  findMany: (...args: any[]) => Promise<StoreStatRecord[]>
  upsert: (...args: any[]) => Promise<StoreStatRecord>
}

type StoreTransactionClient = {
  store: StoreModelClient
  storeStat: StoreStatModelClient
}

type StorePrismaClient = {
  user: {
    findUnique: (...args: any[]) => Promise<{ status: string; managedDepartments: { id: string }[] } | null>
  }
  department: {
    findUnique: (...args: any[]) => Promise<{
      id: string
      name: string
      code: string
      accent: string
      isActive: boolean
    } | null>
  }
  store: StoreModelClient
  storeStat: StoreStatModelClient
  $transaction: <T>(fn: (transaction: StoreTransactionClient) => Promise<T>) => Promise<T>
}

const storePrisma = prisma as unknown as StorePrismaClient

const STORE_SELECT = {
  id: true,
  name: true,
  url: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
      accent: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
    },
  },
  stats: {
    orderBy: {
      statDate: 'desc',
    },
    take: 10,
    select: {
      id: true,
      statDate: true,
      views: true,
      visitors: true,
      orders: true,
      revenue: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      stats: true,
    },
  },
} as const

const STORE_STAT_SELECT = {
  id: true,
  statDate: true,
  views: true,
  visitors: true,
  orders: true,
  revenue: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

function isAdmin(role?: CurrentUserRole) {
  return role === 'ADMIN'
}

const STORE_DEPARTMENT_KEYS = new Set(['etsy', 'amazon', 'blogging', 'bg01'])

function isStoreDepartment(department?: { code?: string; name?: string }) {
  if (!department) {
    return false
  }

  const code = String(department.code || '').trim().toUpperCase()
  const name = String(department.name || '').trim().toLowerCase()

  return STORE_DEPARTMENT_KEYS.has(code.toLowerCase()) || STORE_DEPARTMENT_KEYS.has(name)
}

async function getAccessibleDepartmentIds(userId: string, role?: CurrentUserRole) {
  if (isAdmin(role)) {
    return null
  }

  const user = await storePrisma.user.findUnique({
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
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  return user.managedDepartments.map((department: { id: string }) => department.id)
}

async function findDepartmentById(departmentId: string) {
  return storePrisma.department.findUnique({
    where: {
      id: departmentId,
    },
    select: {
      id: true,
      name: true,
      code: true,
      accent: true,
      isActive: true,
    },
  })
}

async function ensureStoreDepartmentAccess(
  userId: string,
  role: CurrentUserRole | undefined,
  departmentId: string,
) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  const department = await findDepartmentById(departmentId)

  if (!department || !department.isActive) {
    throw new AppError('Department not found or inactive', HTTP_STATUS.BAD_REQUEST)
  }

  if (!isStoreDepartment(department)) {
    throw new AppError(
      'Store management is available only inside the Etsy, Amazon, or Blogging department',
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(departmentId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  return department
}

async function findStoreById(storeId: string): Promise<StoreRecord | null> {
  return storePrisma.store.findUnique({
    where: {
      id: storeId,
    },
    select: STORE_SELECT,
  }) as Promise<StoreRecord | null>
}

function normalizeStorePayload(payload: StorePayload) {
  return {
    name: normalizeStoreName(payload.name),
    url: normalizeStoreUrl(payload.url),
    departmentId: payload.departmentId,
    isActive: payload.isActive ?? true,
  }
}

function normalizeStoreUpdatePayload(payload: UpdateStorePayload, currentStore: SafeStore) {
  return {
    name: payload.name !== undefined ? normalizeStoreName(payload.name) : currentStore.name,
    url: payload.url !== undefined ? normalizeStoreUrl(payload.url) : currentStore.url,
    departmentId: payload.departmentId ?? currentStore.department.id,
    isActive: payload.isActive ?? currentStore.isActive,
  }
}

function normalizeStatPayload(payload: StoreStatPayload) {
  const statDate = normalizeStoreDate(payload.statDate)

  if (!statDate) {
    throw new AppError('Invalid stat date', HTTP_STATUS.BAD_REQUEST)
  }

  return {
    statDate,
    views: Math.max(0, Math.trunc(Number(payload.views) || 0)),
    visitors: Math.max(0, Math.trunc(Number(payload.visitors) || 0)),
    orders: Math.max(0, Math.trunc(Number(payload.orders) || 0)),
    revenue: Math.max(0, Number(payload.revenue) || 0),
  }
}

function normalizeReportRange(range?: string): StoreReportRange {
  const normalized = String(range || 'daily').trim().toLowerCase()

  if (!storeReportRangeValues.includes(normalized as StoreReportRange)) {
    return 'daily'
  }

  return normalized as StoreReportRange
}

function getDefaultReportWindow() {
  const to = new Date()
  const from = new Date(to.getTime())
  from.setUTCDate(from.getUTCDate() - 30)
  from.setUTCHours(0, 0, 0, 0)
  to.setUTCHours(23, 59, 59, 999)

  return { from, to }
}

function parseReportWindow(query: { from?: string; to?: string }) {
  const defaultWindow = getDefaultReportWindow()

  const from = query.from ? new Date(query.from) : defaultWindow.from
  const to = query.to ? new Date(query.to) : defaultWindow.to

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError('Invalid report date range', HTTP_STATUS.BAD_REQUEST)
  }

  from.setUTCHours(0, 0, 0, 0)
  to.setUTCHours(23, 59, 59, 999)

  if (from > to) {
    throw new AppError('Report start date cannot be after end date', HTTP_STATUS.BAD_REQUEST)
  }

  return { from, to }
}

async function getStoreWithScope(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
) {
  const store = await findStoreById(storeId)

  if (!store) {
    return null
  }

  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(store.department.id)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  if (!isStoreDepartment(store.department)) {
    throw new AppError(
      'Store management is available only inside the Etsy, Amazon, or Blogging department',
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  return store
}

export async function listStoresService(
  userId: string,
  role: CurrentUserRole | undefined,
  query: StoreListQuery,
) {
  if (!query.departmentId) {
    throw new AppError('departmentId is required', HTTP_STATUS.BAD_REQUEST)
  }

  await ensureStoreDepartmentAccess(userId, role, query.departmentId)

  const stores = await storePrisma.store.findMany({
    where: {
      departmentId: query.departmentId,
    },
    orderBy: [
      {
        isActive: 'desc',
      },
      {
        updatedAt: 'desc',
      },
    ],
    select: STORE_SELECT,
  })

  return stores.map((store) => toSafeStore(store as StoreRecord))
}

export async function getStoreService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
) {
  const store = await getStoreWithScope(userId, role, storeId)

  if (!store) {
    return null
  }

  return toSafeStore(store)
}

export async function createStoreService(
  userId: string,
  role: CurrentUserRole | undefined,
  payload: StorePayload,
) {
  const normalizedPayload = normalizeStorePayload(payload)

  await ensureStoreDepartmentAccess(userId, role, normalizedPayload.departmentId)

  try {
    const store = await storePrisma.store.create({
      data: {
        ...normalizedPayload,
        createdById: userId,
        updatedById: userId,
      },
      select: STORE_SELECT,
    })

    return toSafeStore(store as StoreRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError('A store with this name or URL already exists in this department', HTTP_STATUS.CONFLICT)
    }

    throw error
  }
}

export async function updateStoreService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
  payload: UpdateStorePayload,
) {
  const store = await getStoreWithScope(userId, role, storeId)

  if (!store) {
    return null
  }

  const normalizedPayload = normalizeStoreUpdatePayload(payload, toSafeStore(store))

  await ensureStoreDepartmentAccess(userId, role, normalizedPayload.departmentId)

  try {
    const updatedStore = await storePrisma.store.update({
      where: {
        id: storeId,
      },
      data: {
        name: normalizedPayload.name,
        url: normalizedPayload.url,
        isActive: normalizedPayload.isActive,
        departmentId: normalizedPayload.departmentId,
        updatedById: userId,
      },
      select: STORE_SELECT,
    })

    return toSafeStore(updatedStore as StoreRecord)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError('A store with this name or URL already exists in this department', HTTP_STATUS.CONFLICT)
    }

    throw error
  }
}

export async function updateStoreStatusService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
  isActive: boolean,
) {
  return updateStoreService(userId, role, storeId, { isActive })
}

export async function deleteStoreService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
) {
  const store = await getStoreWithScope(userId, role, storeId)

  if (!store) {
    return null
  }

  await storePrisma.store.delete({
    where: {
      id: storeId,
    },
  })

  return true
}

export async function upsertStoreStatService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
  payload: StoreStatPayload,
) {
  const store = await getStoreWithScope(userId, role, storeId)

  if (!store) {
    return null
  }

  const normalizedPayload = normalizeStatPayload(payload)
  const statData = {
    statDate: normalizedPayload.statDate,
    views: normalizedPayload.views,
    visitors: normalizedPayload.visitors,
    orders: normalizedPayload.orders,
    revenue: normalizedPayload.revenue,
  }

  const stat = await storePrisma.$transaction(async (transaction) => {
    const savedStat = await transaction.storeStat.upsert({
      where: {
        storeId_statDate: {
          storeId,
          statDate: normalizedPayload.statDate,
        },
      },
      create: {
        ...statData,
        storeId,
        createdById: userId,
        updatedById: userId,
      },
      update: {
        ...statData,
        updatedById: userId,
      },
      select: STORE_STAT_SELECT,
    })

    await transaction.store.update({
      where: {
        id: storeId,
      },
      data: {
        updatedById: userId,
      },
    })

    return savedStat
  })

  return toSafeStoreStat(stat as StoreStatRecord)
}

export async function getStoreReportService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
  query: {
    range?: string
    from?: string
    to?: string
  },
) {
  const store = await getStoreWithScope(userId, role, storeId)

  if (!store) {
    return null
  }

  const range = normalizeReportRange(query.range)
  const { from, to } = parseReportWindow(query)

  const stats = await storePrisma.storeStat.findMany({
    where: {
      storeId,
      statDate: {
        gte: from,
        lte: to,
      },
    },
    orderBy: {
      statDate: 'asc',
    },
    select: STORE_STAT_SELECT,
  })

  return toStoreReportPayload(toSafeStore(store as StoreRecord), range, stats as StoreStatRecord[])
}

export async function exportStoreReportService(
  userId: string,
  role: CurrentUserRole | undefined,
  storeId: string,
  query: {
    range?: string
    from?: string
    to?: string
  },
) {
  const report = await getStoreReportService(userId, role, storeId, query)

  if (!report) {
    return null
  }

  return {
    report,
    csv: buildStoreReportCsv(report),
    pdf: buildStoreReportPdf(report),
  }
}
