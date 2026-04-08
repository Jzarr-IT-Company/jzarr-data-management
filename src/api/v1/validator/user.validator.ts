import { z } from 'zod'
import { SUB_ADMIN_SCREEN_OPTIONS } from '../services/user.helpers.js'

const departmentIdSchema = z.string().trim().min(1)
const managerStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
const subAdminScreenSchema = z.enum(SUB_ADMIN_SCREEN_OPTIONS)

export const createManagerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().min(2).optional(),
  status: managerStatusSchema.optional(),
  departmentIds: z.array(departmentIdSchema).min(1),
})

export const createSubAdminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().min(2).optional(),
  status: managerStatusSchema.optional(),
  departmentIds: z.array(departmentIdSchema).min(1),
  allowedScreens: z.array(subAdminScreenSchema).min(1),
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

export const updateSubAdminSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().min(2).optional(),
  status: managerStatusSchema.optional(),
  departmentIds: z.array(departmentIdSchema).min(1).optional(),
  allowedScreens: z.array(subAdminScreenSchema).min(1).optional(),
})

export const updateSubAdminStatusSchema = z.object({
  status: managerStatusSchema,
})

export const resetSubAdminPasswordSchema = z.object({
  password: z.string().min(6),
})
