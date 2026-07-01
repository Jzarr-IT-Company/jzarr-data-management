import { prisma } from '../../../lib/prisma.js'
import { calculateTargetProgress } from './target.service.js'

// A single personal "hub" for the logged-in user: their active targets,
// the leads assigned to them, pipeline money totals, and their open tasks.
export async function getMyWorkService(userId: string) {
  const now = new Date()

  const [activeTargets, assignedLeads, pipeline, statusCounts, openTasks] = await Promise.all([
    // Targets currently in progress for me
    prisma.target.findMany({
      where: {
        assignedToId: userId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: { periodEnd: 'asc' },
      select: {
        id: true,
        title: true,
        period: true,
        targetValue: true,
        periodStart: true,
        periodEnd: true,
        assignedById: true,
      },
    }),

    // Leads assigned to me (my pipeline)
    prisma.lead.findMany({
      where: { assignedToId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        referenceNo: true,
        name: true,
        phone: true,
        city: true,
        status: true,
        totalAmount: true,
        receivingAmount: true,
        pendingAmount: true,
        updatedAt: true,
        department: { select: { name: true, code: true } },
      },
    }),

    // Money totals across my assigned leads
    prisma.lead.aggregate({
      _sum: { totalAmount: true, receivingAmount: true, pendingAmount: true },
      where: { assignedToId: userId },
    }),

    // Lead status breakdown for my assigned leads
    prisma.lead.groupBy({
      by: ['status'],
      where: { assignedToId: userId },
      _count: { _all: true },
    }),

    // My open tasks (assigned to me, not complete)
    prisma.task.findMany({
      where: { managerId: userId, status: { not: 'COMPLETE' } },
      orderBy: { dueDate: 'asc' },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        department: { select: { name: true } },
      },
    }),
  ])

  const targets = await Promise.all(
    activeTargets.map(async (t) => {
      const progress = await calculateTargetProgress({
        assignedToId: userId,
        targetValue: t.targetValue,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
      })
      return { ...t, progress }
    }),
  )

  const statusMap = Object.fromEntries(statusCounts.map((r) => [r.status, r._count._all]))
  const totalLeads = statusCounts.reduce((sum, r) => sum + r._count._all, 0)

  return {
    pipeline: {
      totalLeads,
      potential: Number(pipeline._sum.totalAmount ?? 0),
      collected: Number(pipeline._sum.receivingAmount ?? 0),
      pending: Number(pipeline._sum.pendingAmount ?? 0),
    },
    stats: {
      new: statusMap['NEW'] ?? 0,
      inProgress: statusMap['IN_PROGRESS'] ?? 0,
      followUp: statusMap['FOLLOW_UP'] ?? 0,
      converted: statusMap['CONVERTED'] ?? 0,
      notInterested: statusMap['NOT_INTERESTED'] ?? 0,
    },
    targets,
    leads: assignedLeads,
    tasks: openTasks,
  }
}
