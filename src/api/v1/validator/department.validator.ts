import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  accent: z.string().trim().min(2),
  isActive: z.boolean().optional(),
})

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  code: z.string().trim().min(2).optional(),
  accent: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
})

export const updateDepartmentStatusSchema = z.object({
  isActive: z.boolean(),
})
