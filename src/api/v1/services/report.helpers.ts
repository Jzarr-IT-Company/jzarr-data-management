import { HTTP_STATUS } from '../../../constant/index.js'
import { AppError } from '../../../utils/app-error.js'
import { leadStatusValues, type LeadStatusValue } from './lead.helpers.js'

export type ReportQuery = {
  search?: string
  status?: string
  departmentId?: string
  createdById?: string
  fromDate?: string
  toDate?: string
  page?: string
  limit?: string
}

export type ReportFilters = {
  search?: string
  status?: LeadStatusValue
  departmentId?: string
  createdById?: string
  fromDate?: Date
  toDate?: Date
  page: number
  limit: number
}

type ScopedLeadWhere = Record<string, unknown>

export function normalizeReportStatus(status?: string | null): LeadStatusValue | null {
  if (typeof status !== 'string') {
    return null
  }

  const normalized = status.trim().toUpperCase()

  return leadStatusValues.includes(normalized as LeadStatusValue)
    ? (normalized as LeadStatusValue)
    : null
}

export function parseReportDate(value?: string | null) {
  if (typeof value !== 'string') {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export function buildReportFilters(query: ReportQuery): ReportFilters {
  const status = normalizeReportStatus(query.status)
  const fromDate = parseReportDate(query.fromDate)
  const toDate = parseReportDate(query.toDate)
  const page = parsePositiveInteger(query.page, 1)
  const limit = Math.min(parsePositiveInteger(query.limit, 20), 100)

  return {
    search: typeof query.search === 'string' ? query.search.trim() || undefined : undefined,
    status: status ?? undefined,
    departmentId:
      typeof query.departmentId === 'string' ? query.departmentId.trim() || undefined : undefined,
    createdById:
      typeof query.createdById === 'string' ? query.createdById.trim() || undefined : undefined,
    fromDate: fromDate ?? undefined,
    toDate: toDate ?? undefined,
    page,
    limit,
  }
}

export function buildScopedLeadWhere(
  filters: ReportFilters,
  accessibleDepartmentIds: string[] | null
) {
  const where: ScopedLeadWhere = {}

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.departmentId) {
    if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(filters.departmentId)) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
    }

    where.departmentId = filters.departmentId
  } else if (accessibleDepartmentIds) {
    where.departmentId = {
      in: accessibleDepartmentIds,
    }
  }

  if (filters.createdById) {
    where.createdById = filters.createdById
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: filters.fromDate } : {}),
      ...(filters.toDate ? { lte: filters.toDate } : {}),
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' as const } },
      { referenceNo: { contains: filters.search, mode: 'insensitive' as const } },
      { phone: { contains: filters.search, mode: 'insensitive' as const } },
      { email: { contains: filters.search, mode: 'insensitive' as const } },
      { city: { contains: filters.search, mode: 'insensitive' as const } },
    ]
  }

  return where
}
