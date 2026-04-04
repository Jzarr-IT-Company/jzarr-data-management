import { z } from 'zod'

const departmentIdSchema = z.string().trim().min(1)
const managerStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])

export const createManagerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().min(2).optional(),
  status: managerStatusSchema.optional(),
  departmentIds: z.array(departmentIdSchema).min(1),
})

export const updateManagerSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().min(2).optional(),
  status: managerStatusSchema.optional(),
  departmentIds: z.array(departmentIdSchema).min(1).optional(),
})

export const updateManagerStatusSchema = z.object({
  status: managerStatusSchema,
})

export const resetManagerPasswordSchema = z.object({
  password: z.string().min(6),
})
