import { z } from 'zod'

import { storeReportRangeValues } from '../services/store.helpers.js'

export const createStoreSchema = z.object({
  name: z.string().trim().min(2),
  url: z.string().trim().url(),
  departmentId: z.string().trim().min(1),
  isActive: z.boolean().optional(),
})

export const updateStoreSchema = z.object({
  name: z.string().trim().min(2).optional(),
  url: z.string().trim().url().optional(),
  departmentId: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
})

export const updateStoreStatusSchema = z.object({
  isActive: z.boolean(),
})

export const upsertStoreStatSchema = z.object({
  statDate: z.string().trim().min(1),
  views: z.coerce.number().int().min(0),
  visitors: z.coerce.number().int().min(0),
  orders: z.coerce.number().int().min(0),
  revenue: z.coerce.number().min(0),
})

export const storeReportQuerySchema = z.object({
  range: z.enum(storeReportRangeValues).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
})
