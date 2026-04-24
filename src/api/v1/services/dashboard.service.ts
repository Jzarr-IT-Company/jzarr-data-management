import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import {
  buildLeadScopeWhere,
  getAccessibleDepartmentIds,
  isAdminRole,
  type CurrentUserRole,
} from './dashboard.helpers.js'

const LEAD_STATUSES = ['NEW', 'IN_PROGRESS', 'CONVERTED', 'NOT_INTERESTED'] as const

type DashboardDepartment = {
  id: string
  name: string
  code: string
  accent: string
  isActive: boolean
  leadCount: number
  managerCount: number
}

type DashboardActivity = {
  id: string
  action: string
  note: string | null
  createdAt: Date
  lead: {
    id: string
    referenceNo: string
    name: string
    status: string
  }
  user: {
    id: string
    name: string
  } | null
}

type DashboardLeadCreator = {
  id: string
  name: string
  email: string
  leadCount: number
}

export type DashboardOverview = {
  scope: {
    isAdmin: boolean
    departmentIds: string[] | null
  }
  kpis: {
    totalLeads: number
    openLeads: number
    convertedLeads: number
    notInterestedLeads: number
    activeManagers: number
    totalDepartments: number
    activeDepartments: number
  }
  statusBreakdown: Array<{
    status: (typeof LEAD_STATUSES)[number]
    count: number
  }>
  departments: DashboardDepartment[]
  recentActivities: DashboardActivity[]
  leadCreators: DashboardLeadCreator[]
}

async function getScopedLeadWhere(userId: string, role?: CurrentUserRole) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)
  const ownLeadOnly = role === 'MANAGER_USER'

  if (role !== 'ADMIN' && accessibleDepartmentIds !== null && accessibleDepartmentIds.length === 0) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  return {
    accessibleDepartmentIds,
    where: buildLeadScopeWhere(accessibleDepartmentIds, ownLeadOnly ? userId : undefined),
  }
}

async function getScopedDepartmentWhere(userId: string, role?: CurrentUserRole) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (role !== 'ADMIN' && accessibleDepartmentIds !== null && accessibleDepartmentIds.length === 0) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  return accessibleDepartmentIds
}

function buildStatusCountMap() {
  return LEAD_STATUSES.reduce<Record<(typeof LEAD_STATUSES)[number], number>>(
    (accumulator, status) => {
      accumulator[status] = 0
      return accumulator
    },
    {
      NEW: 0,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      NOT_INTERESTED: 0,
    }
  )
}

export async function getDashboardOverviewService(userId: string, role?: CurrentUserRole) {
  const isAdmin = isAdminRole(role)
  const leadScope = await getScopedLeadWhere(userId, role)
  const departmentScope = await getScopedDepartmentWhere(userId, role)

  const [
    leadTotal,
    leadStatusGroups,
    departmentRows,
    activeManagerCount,
    recentActivities,
    leadCreatorGroups,
  ] = await Promise.all([
      prisma.lead.count({
        where: leadScope.where,
      }),
      prisma.lead.groupBy({
        by: ['status'],
        where: leadScope.where,
        _count: {
          _all: true,
        },
      }),
      prisma.department.findMany({
        where: isAdmin || !departmentScope ? undefined : { id: { in: departmentScope } },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          code: true,
          accent: true,
          isActive: true,
          _count: {
            select: {
              leads: true,
              managers: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          role: 'MANAGER',
          status: 'ACTIVE',
          ...(isAdmin || !departmentScope
            ? {}
            : {
                managedDepartments: {
                  some: {
                    id: {
                      in: departmentScope,
                    },
                  },
                },
              }),
        },
      }),
      prisma.leadActivity.findMany({
        where: {
          ...(isAdmin || !departmentScope
            ? {}
            : {
                lead: {
                  departmentId: {
                    in: departmentScope,
                  },
                },
              }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
        select: {
          id: true,
          action: true,
          note: true,
          createdAt: true,
          lead: {
            select: {
              id: true,
              referenceNo: true,
              name: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.lead.groupBy({
        by: ['createdById'],
        where: leadScope.where,
        _count: {
          _all: true,
        },
      }),
    ])

  const statusCounts = buildStatusCountMap()

  for (const group of leadStatusGroups) {
    statusCounts[group.status as (typeof LEAD_STATUSES)[number]] = group._count._all
  }

  const departments = departmentRows.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    accent: department.accent,
    isActive: department.isActive,
    leadCount: department._count.leads,
    managerCount: department._count.managers,
  }))

  const activities = recentActivities.map((activity) => ({
    id: activity.id,
    action: activity.action,
    note: activity.note,
    createdAt: activity.createdAt,
    lead: activity.lead,
    user: activity.user,
  }))

  const creatorIds = leadCreatorGroups
    .map((group) => group.createdById)
    .filter((creatorId): creatorId is string => typeof creatorId === 'string' && creatorId.length > 0)

  const creatorRows =
    creatorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: creatorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : []

  const creatorMap = new Map(
    creatorRows.map((creator) => [
      creator.id,
      {
        id: creator.id,
        name: creator.name,
        email: creator.email,
      },
    ])
  )

  const leadCreators = leadCreatorGroups
    .map((group) => {
      if (!group.createdById) {
        return null
      }

      const creator = creatorMap.get(group.createdById)

      if (!creator) {
        return null
      }

      return {
        ...creator,
        leadCount: group._count._all,
      }
    })
    .filter((creator): creator is DashboardLeadCreator => creator !== null)
    .sort((left, right) => right.leadCount - left.leadCount)

  return {
    scope: {
      isAdmin,
      departmentIds: leadScope.accessibleDepartmentIds,
    },
    kpis: {
      totalLeads: leadTotal,
      openLeads: statusCounts.NEW + statusCounts.IN_PROGRESS,
      convertedLeads: statusCounts.CONVERTED,
      notInterestedLeads: statusCounts.NOT_INTERESTED,
      activeManagers: activeManagerCount,
      totalDepartments: departments.length,
      activeDepartments: departments.filter((department) => department.isActive).length,
    },
    statusBreakdown: LEAD_STATUSES.map((status) => ({
      status,
      count: statusCounts[status],
    })),
    departments,
    recentActivities: activities,
    leadCreators,
  } satisfies DashboardOverview
}
