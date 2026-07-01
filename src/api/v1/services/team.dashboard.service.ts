import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import type { CurrentUserRole } from './user.access.js'
import type { TargetPeriodValue } from './target.service.js'

type MemberRecord = {
  id: string
  name: string
  email: string
  role: string
  designation: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

type LeadCountRow = {
  assignedToId: string | null
  status: string
  _count: { _all: number }
}

type ActivityCountRow = {
  userId: string | null
  _count: { _all: number }
}

type LastActivityRow = {
  userId: string | null
  createdAt: Date
}

type RawTarget = {
  id: string
  assignedToId: string
  title: string
  period: TargetPeriodValue
  targetValue: number
  periodStart: Date
  periodEnd: Date
}

export type AgentStats = {
  id: string
  name: string
  email: string
  role: string
  designation: string | null
  isActive: boolean
  lastActivityAt: Date | null
  activities7d: number
  leads: {
    assigned: number
    converted: number
    followUp: number
    new: number
    inProgress: number
  }
  currentTarget: {
    id: string
    title: string
    period: string
    targetValue: number
    achieved: number
    percentage: number
    periodEnd: Date
  } | null
}

export type TeamDashboardData = {
  totalMembers: number
  activeMembers: number
  teamLeads: {
    total: number
    converted: number
    followUp: number
    new: number
    inProgress: number
  }
  members: AgentStats[]
}

async function fetchTeamMembers(
  userId: string,
  role: CurrentUserRole | undefined,
): Promise<MemberRecord[]> {
  if (role === 'MANAGER') {
    return prisma.user.findMany({
      where: { managerId: userId, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, designation: true, status: true },
      orderBy: { name: 'asc' },
    }) as Promise<MemberRecord[]>
  }

  if (role === 'SUB_ADMIN') {
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { managedDepartments: { select: { id: true } } },
    })
    if (!actor) throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)

    const deptIds = actor.managedDepartments.map((d) => d.id)

    return prisma.user.findMany({
      where: {
        role: 'MANAGER',
        status: 'ACTIVE',
        managedDepartments: { some: { id: { in: deptIds } } },
      },
      select: { id: true, name: true, email: true, role: true, designation: true, status: true },
      orderBy: { name: 'asc' },
    }) as Promise<MemberRecord[]>
  }

  if (role === 'ADMIN') {
    return prisma.user.findMany({
      where: { role: { in: ['SUB_ADMIN', 'MANAGER'] }, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, designation: true, status: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }) as Promise<MemberRecord[]>
  }

  return []
}

// PKR collected (via lead receipts) on leads assigned to the user during the period.
async function calculateTargetAchieved(
  assignedToId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const result = await prisma.leadReceipt.aggregate({
    _sum: { amount: true },
    where: {
      lead: { assignedToId },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  })

  return Number(result._sum.amount ?? 0)
}

export async function getTeamDashboardService(
  userId: string,
  role: CurrentUserRole | undefined,
): Promise<TeamDashboardData> {
  if (role === 'MANAGER_USER') {
    throw new AppError('Team dashboard is not available for agents', HTTP_STATUS.FORBIDDEN)
  }

  const members = await fetchTeamMembers(userId, role)

  if (members.length === 0) {
    return {
      totalMembers: 0,
      activeMembers: 0,
      teamLeads: { total: 0, converted: 0, followUp: 0, new: 0, inProgress: 0 },
      members: [],
    }
  }

  const memberIds = members.map((m) => m.id)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const now = new Date()

  // Batch all DB queries in parallel
  const [leadCountRows, activityCountRows, lastActivityRows, currentTargets] = await Promise.all([
    // Lead counts grouped by assignee + status
    prisma.lead.groupBy({
      by: ['assignedToId', 'status'],
      where: { assignedToId: { in: memberIds } },
      _count: { _all: true },
    }),

    // Activity count per member in last 7 days
    prisma.leadActivity.groupBy({
      by: ['userId'],
      where: { userId: { in: memberIds }, createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),

    // Last activity timestamp per member
    prisma.leadActivity.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true, createdAt: true },
    }),

    // Current active targets per member (period covers today)
    prisma.target.findMany({
      where: {
        assignedToId: { in: memberIds },
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        assignedToId: true,
        title: true,
        period: true,
        targetValue: true,
        periodStart: true,
        periodEnd: true,
      },
    }),
  ])

  // Build lookup maps from batch data
  const leadsByMember = new Map<string, Record<string, number>>()
  for (const row of leadCountRows as LeadCountRow[]) {
    if (!row.assignedToId) continue
    if (!leadsByMember.has(row.assignedToId)) leadsByMember.set(row.assignedToId, {})
    leadsByMember.get(row.assignedToId)![row.status] = row._count._all
  }

  const activitiesMap = new Map<string, number>()
  for (const row of activityCountRows as ActivityCountRow[]) {
    if (row.userId) activitiesMap.set(row.userId, row._count._all)
  }

  const lastActivityMap = new Map<string, Date>()
  for (const row of lastActivityRows as LastActivityRow[]) {
    if (row.userId) lastActivityMap.set(row.userId, row.createdAt)
  }

  // One current target per member (first one wins from ordered query)
  const currentTargetMap = new Map<string, RawTarget>()
  for (const t of currentTargets as RawTarget[]) {
    if (!currentTargetMap.has(t.assignedToId)) {
      currentTargetMap.set(t.assignedToId, t)
    }
  }

  // Resolve target achievements (one query per member with a target — small N)
  const targetAchievements = new Map<string, number>()
  await Promise.all(
    [...currentTargetMap.entries()].map(async ([memberId, target]) => {
      const achieved = await calculateTargetAchieved(
        memberId,
        target.periodStart,
        target.periodEnd,
      )
      targetAchievements.set(memberId, achieved)
    }),
  )

  // Build per-member stats
  const memberStats: AgentStats[] = members.map((member) => {
    const statusCounts = leadsByMember.get(member.id) ?? {}
    const activities7d = activitiesMap.get(member.id) ?? 0
    const lastActivityAt = lastActivityMap.get(member.id) ?? null
    const rawTarget = currentTargetMap.get(member.id) ?? null
    const achieved = rawTarget ? (targetAchievements.get(member.id) ?? 0) : 0

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      designation: member.designation,
      isActive: member.status === 'ACTIVE',
      lastActivityAt,
      activities7d,
      leads: {
        assigned: Object.values(statusCounts).reduce((s, n) => s + n, 0),
        converted: statusCounts['CONVERTED'] ?? 0,
        followUp: statusCounts['FOLLOW_UP'] ?? 0,
        new: statusCounts['NEW'] ?? 0,
        inProgress: statusCounts['IN_PROGRESS'] ?? 0,
      },
      currentTarget: rawTarget
        ? {
            id: rawTarget.id,
            title: rawTarget.title,
            period: rawTarget.period,
            targetValue: rawTarget.targetValue,
            achieved,
            percentage:
              rawTarget.targetValue > 0
                ? Math.min(Math.round((achieved / rawTarget.targetValue) * 100), 100)
                : 0,
            periodEnd: rawTarget.periodEnd,
          }
        : null,
    }
  })

  // Team-level totals
  const teamLeads = memberStats.reduce(
    (acc, m) => ({
      total: acc.total + m.leads.assigned,
      converted: acc.converted + m.leads.converted,
      followUp: acc.followUp + m.leads.followUp,
      new: acc.new + m.leads.new,
      inProgress: acc.inProgress + m.leads.inProgress,
    }),
    { total: 0, converted: 0, followUp: 0, new: 0, inProgress: 0 },
  )

  return {
    totalMembers: members.length,
    activeMembers: memberStats.filter((m) => m.isActive).length,
    teamLeads,
    members: memberStats,
  }
}

// My own performance stats (for any user to see their own numbers)
export async function getMyStatsService(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const now = new Date()

  const [leadCounts, activities7d, currentTargets] = await Promise.all([
    prisma.lead.groupBy({
      by: ['status'],
      where: { assignedToId: userId },
      _count: { _all: true },
    }),

    prisma.leadActivity.count({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
    }),

    prisma.target.findMany({
      where: {
        assignedToId: userId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      select: {
        id: true,
        title: true,
        period: true,
        targetValue: true,
        periodStart: true,
        periodEnd: true,
      },
    }),
  ])

  const statusMap = Object.fromEntries(
    leadCounts.map((r) => [r.status, r._count._all]),
  )

  const targetsWithProgress = await Promise.all(
    currentTargets.map(async (t) => {
      const achieved = await calculateTargetAchieved(
        userId,
        t.periodStart,
        t.periodEnd,
      )
      return {
        ...t,
        achieved,
        percentage: t.targetValue > 0 ? Math.min(Math.round((achieved / t.targetValue) * 100), 100) : 0,
      }
    }),
  )

  return {
    leads: {
      assigned: Object.values(statusMap).reduce((s: number, n) => s + (n as number), 0),
      converted: statusMap['CONVERTED'] ?? 0,
      followUp: statusMap['FOLLOW_UP'] ?? 0,
      new: statusMap['NEW'] ?? 0,
      inProgress: statusMap['IN_PROGRESS'] ?? 0,
    },
    activities7d,
    currentTargets: targetsWithProgress,
  }
}
