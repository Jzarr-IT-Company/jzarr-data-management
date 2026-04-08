export const taskStatusValues = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETE'] as const

export type TaskStatusValue = (typeof taskStatusValues)[number]

export const taskPriorityValues = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export type TaskPriorityValue = (typeof taskPriorityValues)[number]

type PersonSummary = {
  id: string
  name: string
}

type DepartmentSummary = {
  id: string
  name: string
  code: string
  accent: string
}

export type TaskRecord = {
  id: string
  title: string
  description: string
  managerId: string
  departmentId: string
  status: TaskStatusValue
  priority: TaskPriorityValue
  startDate: Date
  dueDate: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
  manager: PersonSummary
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
}

export type SafeTask = TaskRecord

export function toSafeTask(task: TaskRecord): SafeTask {
  return task
}

export function normalizeTaskStatus(status?: string | null): TaskStatusValue | null {
  if (typeof status !== 'string') {
    return null
  }

  const normalized = status.trim().toUpperCase()

  return taskStatusValues.includes(normalized as TaskStatusValue)
    ? (normalized as TaskStatusValue)
    : null
}

export function normalizeTaskPriority(priority?: string | null): TaskPriorityValue | null {
  if (typeof priority !== 'string') {
    return null
  }

  const normalized = priority.trim().toUpperCase()

  return taskPriorityValues.includes(normalized as TaskPriorityValue)
    ? (normalized as TaskPriorityValue)
    : null
}

export function normalizeTaskText(value?: string | null) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

export function normalizeTaskDate(value: string | Date) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  date.setUTCHours(0, 0, 0, 0)
  return date
}
