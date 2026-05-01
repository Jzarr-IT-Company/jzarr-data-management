import { z } from 'zod'

import { storeReportRangeValues } from '../services/store.helpers.js'

export const createStoreSchema = z.object({
  name: z.string().trim().min(2),
  url: z.string().trim().url(),
  departmentId: z.string().trim().min(1),
  isActive: z.boolean().optional(),
  amazonHolderName: z.string().trim().optional().nullable(),
  sellerAccountGmail: z.string().trim().email().optional().nullable(),
  sellerAccountPassword: z.string().trim().optional().nullable(),
  sellerAccountAddress: z.string().trim().optional().nullable(),
  userAccountGmail: z.string().trim().email().optional().nullable(),
  userAccountPassword: z.string().trim().optional().nullable(),
  userManagingMemberName: z.string().trim().optional().nullable(),
  inventory: z.coerce.number().int().min(0).optional().nullable(),
  recordDate: z.string().trim().optional().nullable(),
  assignCode: z.string().trim().regex(/^[a-z0-9-]+$/i).optional().nullable(),
  costOfGoods: z.coerce.number().min(0).optional().nullable(),
  ppcSpending: z.coerce.number().min(0).optional().nullable(),
})

export const updateStoreSchema = z.object({
  name: z.string().trim().min(2).optional(),
  url: z.string().trim().url().optional(),
  departmentId: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  amazonHolderName: z.string().trim().optional().nullable(),
  sellerAccountGmail: z.string().trim().email().optional().nullable(),
  sellerAccountPassword: z.string().trim().optional().nullable(),
  sellerAccountAddress: z.string().trim().optional().nullable(),
  userAccountGmail: z.string().trim().email().optional().nullable(),
  userAccountPassword: z.string().trim().optional().nullable(),
  userManagingMemberName: z.string().trim().optional().nullable(),
  inventory: z.coerce.number().int().min(0).optional().nullable(),
  recordDate: z.string().trim().optional().nullable(),
  assignCode: z.string().trim().regex(/^[a-z0-9-]+$/i).optional().nullable(),
  costOfGoods: z.coerce.number().min(0).optional().nullable(),
  ppcSpending: z.coerce.number().min(0).optional().nullable(),
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
