import { z } from 'zod'

const targetPeriodValues = ['WEEKLY', 'MONTHLY', 'SIX_MONTH', 'YEARLY'] as const

export const createTargetSchema = z.object({
  assignedToId: z.string().trim().min(1, 'Recipient is required'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  description: z.string().trim().max(500).nullable().optional(),
  period: z.enum(targetPeriodValues),
  targetValue: z.number().int().min(1, 'Target amount must be at least 1'),
  periodStart: z.string().datetime({ offset: true, message: 'Valid start date required' }),
  periodEnd: z.string().datetime({ offset: true, message: 'Valid end date required' }),
  notes: z.string().trim().max(1000).nullable().optional(),
})

export const updateTargetSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  period: z.enum(targetPeriodValues).optional(),
  targetValue: z.number().int().min(1).optional(),
  periodStart: z.string().datetime({ offset: true }).optional(),
  periodEnd: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
})
