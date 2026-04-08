import { z } from 'zod'

import { taskPriorityValues, taskStatusValues } from '../services/task.helpers.js'

const nullableText = z.string().trim().min(1).nullable().optional()

const taskDate = z.string().trim().min(1)

export const createTaskSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  managerId: z.string().trim().min(1),
  departmentId: z.string().trim().min(1),
  status: z.enum(taskStatusValues).optional(),
  priority: z.enum(taskPriorityValues).optional(),
  startDate: taskDate,
  dueDate: taskDate,
  notes: nullableText,
})

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(2).optional(),
  managerId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  status: z.enum(taskStatusValues).optional(),
  priority: z.enum(taskPriorityValues).optional(),
  startDate: taskDate.optional(),
  dueDate: taskDate.optional(),
  notes: nullableText,
})

export const updateTaskStatusSchema = z.object({
  status: z.enum(taskStatusValues),
})
