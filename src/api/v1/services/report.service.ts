import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import { getAccessibleDepartmentIds, isAdminRole } from './dashboard.helpers.js'
import { toSafeLead, type LeadRecord } from './lead.helpers.js'
import {
  buildReportFilters,
  buildScopedLeadWhere,
  type ReportQuery,
} from './report.helpers.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER'

type ReportLeadRow = LeadRecord

const REPORT_LEAD_SELECT = {
  id: true,
  referenceNo: true,
  name: true,
  fatherName: true,
  email: true,
  phone: true,
  whatsapp: true,
  city: true,
  address: true,
  message: true,
  status: true,
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
} as const

async function getScopedDepartments(userId: string, role?: CurrentUserRole) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (role !== 'ADMIN' && accessibleDepartmentIds !== null && accessibleDepartmentIds.length === 0) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  return accessibleDepartmentIds
}

function buildSummaryCountMap() {
  return {
    totalLeads: 0,
    newLeads: 0,
    inProgressLeads: 0,
    convertedLeads: 0,
    notInterestedLeads: 0,
  }
}

export async function getLeadsReportService(userId: string, role?: CurrentUserRole, query?: ReportQuery) {
  const filters = buildReportFilters(query ?? {})
  const accessibleDepartmentIds = await getScopedDepartments(userId, role)
  const isAdmin = isAdminRole(role)
  const where = buildScopedLeadWhere(filters, accessibleDepartmentIds)

  const [totalCount, rows, groupedStatus, departmentRows] = await Promise.all([
    prisma.lead.count({
      where,
    }),
    prisma.lead.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: REPORT_LEAD_SELECT,
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma.department.findMany({
      where: isAdmin || !accessibleDepartmentIds ? undefined : { id: { in: accessibleDepartmentIds } },
      select: {
        id: true,
        name: true,
        code: true,
        accent: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  const summary = buildSummaryCountMap()
  summary.totalLeads = totalCount

  for (const group of groupedStatus) {
    if (group.status === 'NEW') summary.newLeads = group._count._all
    if (group.status === 'IN_PROGRESS') summary.inProgressLeads = group._count._all
    if (group.status === 'CONVERTED') summary.convertedLeads = group._count._all
    if (group.status === 'NOT_INTERESTED') summary.notInterestedLeads = group._count._all
  }

  const leads = rows.map((lead: ReportLeadRow) => toSafeLead(lead))

  return {
    filters,
    summary: {
      ...summary,
      departmentCount: departmentRows.length,
    },
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / filters.limit)),
    },
    departments: departmentRows,
    leads,
  }
}
