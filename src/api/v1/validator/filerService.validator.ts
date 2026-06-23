import { z } from 'zod'

export const createFilerServiceSchema = z.object({
  name: z.string().trim().min(2),
})

export const updateFilerServiceSchema = z.object({
  name: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
})
