import type { Prisma } from '@prisma/client'

import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import {
  emitTaskCreatedEvent,
  emitTaskStatusEvent,
} from '../../../socket/task-socket.js'
import { getAccessibleDepartmentIds } from './dashboard.helpers.js'
import {
  normalizeTaskDate,
  normalizeTaskPriority,
  normalizeTaskStatus,
  normalizeTaskText,
  type TaskRecord,
  toSafeTask,
  type SafeTask,
  type TaskPriorityValue,
  type TaskStatusValue,
} from './task.helpers.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER' | 'MANAGER_USER' | 'SUB_ADMIN'

type TaskListQuery = {
  search?: string
  status?: string
  priority?: string
  managerId?: string
  departmentId?: string
  page?: string
  limit?: string
}

type TaskListFilters = {
  search?: string
  status?: TaskStatusValue
  priority?: TaskPriorityValue
  managerId?: string
  departmentId?: string
  page: number
  limit: number
}

type TaskPayload = {
  title: string
  description: string
  managerId: string
  departmentId: string
  status?: TaskStatusValue
  priority?: TaskPriorityValue
  startDate: string
  dueDate: string
  notes?: string | null
}

type UpdateTaskPayload = Partial<TaskPayload>

type UpdateTaskStatusPayload = {
  status: TaskStatusValue
}

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  managerId: true,
  departmentId: true,
  status: true,
  priority: true,
  startDate: true,
  dueDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  manager: {
    select: {
      id: true,
      name: true,
    },
  },
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

type TaskListResponse = {
  tasks: SafeTask[]
  filters: {
    search?: string
    status?: TaskStatusValue
    priority?: TaskPriorityValue
    managerId?: string
    departmentId?: string
    page: number
    limit: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function buildTaskWhere(
  userId: string,
  role: CurrentUserRole | undefined,
  query: TaskListFilters,
  accessibleDepartmentIds: string[] | null,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {}
  const and: Prisma.TaskWhereInput[] = []

  if (role !== 'ADMIN') {
    if (!accessibleDepartmentIds) {
      throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
    }

    // Managers see tasks assigned to them and tasks they created for their agents
    and.push({ OR: [{ managerId: userId }, { createdById: userId }] })

    if (query.departmentId && !accessibleDepartmentIds.includes(query.departmentId)) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
    }
  }

  if (query.search) {
    and.push({
      OR: [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
        { notes: { contains: query.search } },
      ],
    })
  }

  if (query.status) {
    const status = normalizeTaskStatus(query.status)

    if (!status) {
      throw new AppError('Invalid task status', HTTP_STATUS.BAD_REQUEST)
    }

    where.status = status
  }

  if (query.priority) {
    const priority = normalizeTaskPriority(query.priority)

    if (!priority) {
      throw new AppError('Invalid task priority', HTTP_STATUS.BAD_REQUEST)
    }

    where.priority = priority
  }

  if (query.managerId) {
    if (role !== 'ADMIN' && query.managerId !== userId) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
    }

    where.managerId = query.managerId
  }

  if (query.departmentId) {
    where.departmentId = query.departmentId
  } else if (role !== 'ADMIN' && accessibleDepartmentIds) {
    where.departmentId = {
      in: accessibleDepartmentIds,
    }
  }

  if (and.length) {
    where.AND = and
  }

  return where
}

async function getScopedDepartments(userId: string, role?: CurrentUserRole) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (role !== 'ADMIN' && accessibleDepartmentIds !== null && accessibleDepartmentIds.length === 0) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  return accessibleDepartmentIds
}

// Validates that the actor may assign a task to the given assignee in the given department.
//   ADMIN     -> assignee can be a SUB_ADMIN, MANAGER, or MANAGER_USER (anyone).
//   SUB_ADMIN -> assignee must be a MANAGER within the sub admin's departments.
//   MANAGER   -> assignee must be one of the manager's own agents (MANAGER_USER).
// Department must always be one that is valid for the chosen assignee.
async function resolveAssigneeAndDepartment(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
  assigneeId: string,
  departmentId: string,
) {
  const assignee = await prisma.user.findUnique({
    where: {
      id: assigneeId,
    },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      managerId: true,
      managedDepartments: {
        select: {
          id: true,
          name: true,
        },
      },
      manager: {
        select: {
          managedDepartments: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!assignee || assignee.status !== 'ACTIVE') {
    throw new AppError('Assignee not found or inactive', HTTP_STATUS.BAD_REQUEST)
  }

  // Departments that are valid targets for this assignee
  const assigneeDepartments =
    assignee.role === 'MANAGER_USER'
      ? assignee.manager?.managedDepartments ?? []
      : assignee.managedDepartments

  if (actorRole === 'ADMIN') {
    if (!['SUB_ADMIN', 'MANAGER', 'MANAGER_USER'].includes(assignee.role)) {
      throw new AppError('Cannot assign tasks to this user', HTTP_STATUS.BAD_REQUEST)
    }

    const department = assigneeDepartments.find((item) => item.id === departmentId)

    if (!department) {
      throw new AppError('Selected department is not valid for this user', HTTP_STATUS.FORBIDDEN)
    }

    return { assignee, department }
  }

  if (actorRole === 'SUB_ADMIN') {
    if (assignee.role !== 'MANAGER') {
      throw new AppError('Sub admins can only assign tasks to managers', HTTP_STATUS.FORBIDDEN)
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { managedDepartments: { select: { id: true } } },
    })

    if (!actor) {
      throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
    }

    const actorDeptIds = new Set(actor.managedDepartments.map((d) => d.id))

    // Department must be one both the sub admin and the manager share
    const department = assignee.managedDepartments.find(
      (item) => item.id === departmentId && actorDeptIds.has(item.id),
    )

    if (!department) {
      throw new AppError('Selected department is not in your shared scope', HTTP_STATUS.FORBIDDEN)
    }

    return { assignee, department }
  }

  if (actorRole === 'MANAGER') {
    if (assignee.role !== 'MANAGER_USER' || assignee.managerId !== actorId) {
      throw new AppError('You can only assign tasks to your own team members', HTTP_STATUS.FORBIDDEN)
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { managedDepartments: { select: { id: true, name: true } } },
    })

    const department = actor?.managedDepartments.find((item) => item.id === departmentId)

    if (!department) {
      throw new AppError('Selected department is not in your scope', HTTP_STATUS.FORBIDDEN)
    }

    return { assignee, department }
  }

  throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
}

// Users the actor can assign tasks to, each with their valid task departments.
export async function getTaskAssignableUsersService(
  actorId: string,
  actorRole: CurrentUserRole | undefined,
): Promise<Array<{ id: string; name: string; email: string; role: string; departments: { id: string; name: string }[] }>> {
  if (actorRole === 'ADMIN') {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: ['SUB_ADMIN', 'MANAGER', 'MANAGER_USER'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managedDepartments: { select: { id: true, name: true } },
        manager: { select: { managedDepartments: { select: { id: true, name: true } } } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departments: u.role === 'MANAGER_USER' ? u.manager?.managedDepartments ?? [] : u.managedDepartments,
    }))
  }

  if (actorRole === 'SUB_ADMIN') {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { managedDepartments: { select: { id: true } } },
    })
    const deptIds = actor?.managedDepartments.map((d) => d.id) ?? []

    const managers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: 'MANAGER',
        managedDepartments: { some: { id: { in: deptIds } } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managedDepartments: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return managers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      departments: m.managedDepartments.filter((d) => deptIds.includes(d.id)),
    }))
  }

  if (actorRole === 'MANAGER') {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { managedDepartments: { select: { id: true, name: true } } },
    })
    const managerDepartments = actor?.managedDepartments ?? []

    const agents = await prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'MANAGER_USER', managerId: actorId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })

    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      departments: managerDepartments,
    }))
  }

  return []
}

function buildTaskSummary(payload: TaskRecord) {
  return toSafeTask(payload)
}

async function createTaskNotification(userId: string, task: TaskRecord, title: string, message: string) {
  await prisma.notification.create({
    data: {
      userId,
      taskId: task.id,
      type: 'TASK',
      title,
      message,
    },
  })
}

async function notifyAdmins(task: TaskRecord, title: string, message: string) {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  })

  if (!admins.length) {
    return
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      taskId: task.id,
      type: 'TASK',
      title,
      message,
    })),
  })
}

export async function listTasksService(
  userId: string,
  role: CurrentUserRole | undefined,
  query?: TaskListQuery,
): Promise<TaskListResponse> {
  const filters: TaskListFilters = {
    search: typeof query?.search === 'string' ? query.search.trim() || undefined : undefined,
    status: normalizeTaskStatus(query?.status) ?? undefined,
    priority: normalizeTaskPriority(query?.priority) ?? undefined,
    managerId: typeof query?.managerId === 'string' ? query.managerId.trim() || undefined : undefined,
    departmentId:
      typeof query?.departmentId === 'string' ? query.departmentId.trim() || undefined : undefined,
    page: parsePositiveInteger(query?.page, 1),
    limit: Math.min(parsePositiveInteger(query?.limit, 20), 100),
  }

  const accessibleDepartmentIds = await getScopedDepartments(userId, role)
  const where = buildTaskWhere(userId, role, filters, accessibleDepartmentIds)

  const [total, rows] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: TASK_SELECT,
    }),
  ])

  return {
    tasks: rows.map((task) => buildTaskSummary(task)),
    filters,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  }
}

export async function getTaskService(userId: string, role: CurrentUserRole | undefined, taskId: string) {
  const accessibleDepartmentIds = await getScopedDepartments(userId, role)

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: TASK_SELECT,
  })

  if (!task) {
    return null
  }

  if (role !== 'ADMIN') {
    const isDepartmentAllowed =
      accessibleDepartmentIds !== null && accessibleDepartmentIds.includes(task.departmentId)
    const isAssigneeOrCreator = task.managerId === userId || task.createdBy?.id === userId

    if (!isDepartmentAllowed || !isAssigneeOrCreator) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
    }
  }

  return buildTaskSummary(task)
}

export async function createTaskService(
  userId: string,
  role: CurrentUserRole | undefined,
  payload: TaskPayload,
) {
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN' && role !== 'MANAGER') {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const title = payload.title.trim()
  const description = payload.description.trim()
  const notes = normalizeTaskText(payload.notes)
  const startDate = normalizeTaskDate(payload.startDate)
  const dueDate = normalizeTaskDate(payload.dueDate)
  const status = normalizeTaskStatus(payload.status) ?? 'TODO'
  const priority = normalizeTaskPriority(payload.priority) ?? 'MEDIUM'

  if (!startDate || !dueDate) {
    throw new AppError('Valid start and due dates are required', HTTP_STATUS.BAD_REQUEST)
  }

  if (dueDate < startDate) {
    throw new AppError('Due date cannot be before start date', HTTP_STATUS.BAD_REQUEST)
  }

  await resolveAssigneeAndDepartment(userId, role, payload.managerId, payload.departmentId)

  const task = await prisma.$transaction(async (transaction) => {
    const created = await transaction.task.create({
      data: {
        title,
        description,
        managerId: payload.managerId,
        departmentId: payload.departmentId,
        status,
        priority,
        startDate,
        dueDate,
        notes,
        createdById: userId,
        updatedById: userId,
      },
      select: TASK_SELECT,
    })

    return created
  })

  await createTaskNotification(
    task.managerId,
    task,
    'New task assigned',
    `${task.title} was assigned to you for ${task.department.name}.`,
  )
  await notifyAdmins(
    task,
    'New task assigned',
    `${task.title} was assigned to ${task.manager.name} for ${task.department.name}.`,
  )

  emitTaskCreatedEvent(
    {
      action: 'assigned',
      taskId: task.id,
      title: task.title,
      message: `${task.title} was assigned to ${task.manager.name} for ${task.department.name}.`,
      managerId: task.manager.id,
      departmentId: task.department.id,
    },
    task.manager.id,
  )

  return buildTaskSummary(task)
}

export async function updateTaskService(
  userId: string,
  role: CurrentUserRole | undefined,
  taskId: string,
  payload: UpdateTaskPayload,
) {
  if (role !== 'ADMIN') {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const existingTask = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      managerId: true,
      departmentId: true,
      title: true,
    },
  })

  if (!existingTask) {
    return null
  }

  const nextManagerId = payload.managerId || existingTask.managerId
  const nextDepartmentId = payload.departmentId || existingTask.departmentId

  await resolveAssigneeAndDepartment(userId, role, nextManagerId, nextDepartmentId)

  const startDate = payload.startDate ? normalizeTaskDate(payload.startDate) : undefined
  const dueDate = payload.dueDate ? normalizeTaskDate(payload.dueDate) : undefined

  if (startDate && dueDate && dueDate < startDate) {
    throw new AppError('Due date cannot be before start date', HTTP_STATUS.BAD_REQUEST)
  }

  const updatedTask = await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      ...(payload.title ? { title: payload.title.trim() } : {}),
      ...(payload.description ? { description: payload.description.trim() } : {}),
      ...(payload.managerId ? { managerId: payload.managerId } : {}),
      ...(payload.departmentId ? { departmentId: payload.departmentId } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.priority ? { priority: payload.priority } : {}),
      ...(startDate ? { startDate } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(payload.notes !== undefined ? { notes: normalizeTaskText(payload.notes) } : {}),
      updatedById: userId,
    },
    select: TASK_SELECT,
  })

  return buildTaskSummary(updatedTask)
}

export async function updateTaskStatusService(
  userId: string,
  role: CurrentUserRole | undefined,
  taskId: string,
  payload: UpdateTaskStatusPayload,
) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      managerId: true,
      departmentId: true,
      title: true,
      createdById: true,
    },
  })

  if (!task) {
    return null
  }

  if (role !== 'ADMIN' && task.managerId !== userId && task.createdById !== userId) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const nextTask = await transaction.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: payload.status,
        updatedById: userId,
      },
      select: TASK_SELECT,
    })

    return nextTask
  })

  if (role === 'ADMIN') {
    await createTaskNotification(
      updated.managerId,
      updated,
      'Task status updated',
      `${updated.title} status changed to ${updated.status.replaceAll('_', ' ').toLowerCase()}.`,
    )
  } else {
    await notifyAdmins(
      updated,
      'Task status updated',
      `${updated.title} moved to ${updated.status.replaceAll('_', ' ').toLowerCase()}.`,
    )
  }

  emitTaskStatusEvent(
    {
      action: 'status-updated',
      taskId: updated.id,
      title: updated.title,
      message: `${updated.title} moved to ${updated.status.replaceAll('_', ' ').toLowerCase()}.`,
      managerId: updated.manager.id,
      departmentId: updated.department.id,
    },
    updated.manager.id,
  )

  return buildTaskSummary(updated)
}

export async function deleteTaskService(userId: string, role: CurrentUserRole | undefined, taskId: string) {
  if (role !== 'ADMIN') {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  const existingTask = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
    },
  })

  if (!existingTask) {
    return false
  }

  await prisma.task.delete({
    where: {
      id: taskId,
    },
  })

  return true
}
