import { z } from 'zod'

import { leadCountryValues, leadSourceValues, leadStatusValues } from '../services/lead.helpers.js'

const nullableText = z.string().trim().min(1).nullable().optional()
const nullableFollowUpDateTime = z.string().datetime({ offset: true }).nullable().optional()
const nullableFollowUpMessage = z.string().trim().min(1).nullable().optional()

function withFollowUpValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const status = typeof data.status === 'string' ? data.status : undefined
    const hasFollowUpFields = Boolean(data.followUpAt || data.followUpMessage)

    if (status === 'FOLLOW_UP') {
      if (!data.followUpAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Follow-up date and time are required when status is Follow Up.',
          path: ['followUpAt'],
        })
      }

      if (!data.followUpMessage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Follow-up message is required when status is Follow Up.',
          path: ['followUpMessage'],
        })
      }
    } else if (hasFollowUpFields) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Follow-up fields can only be used when status is Follow Up.',
        path: ['followUpAt'],
      })
    }
  })
}

const nullableDecimal = z.number().nullable().optional()
const nullableServiceId = z.string().trim().min(1).nullable().optional()

export const createLeadSchema = withFollowUpValidation(
  z.object({
    name: z.string().trim().min(2),
    fatherName: nullableText,
    email: nullableText,
    phone: z.string().trim().min(5),
    whatsapp: nullableText,
    city: nullableText,
    country: z.enum(leadCountryValues).optional(),
    address: nullableText,
    message: nullableText,
    status: z.enum(leadStatusValues).optional(),
    source: z.enum(leadSourceValues).optional(),
    departmentId: z.string().trim().min(1),
    followUpAt: nullableFollowUpDateTime,
    followUpMessage: nullableFollowUpMessage,
    serviceId: nullableServiceId,
    totalAmount: nullableDecimal,
    receivingAmount: nullableDecimal,
  })
)

export const assignLeadsSchema = z.object({
  leadIds: z.array(z.string().trim().min(1)).min(1, 'At least one lead is required'),
  assignToUserId: z.string().trim().min(1, 'Target user is required'),
  note: z.string().trim().max(500).nullable().optional(),
})

export const updateLeadSchema = withFollowUpValidation(
  z.object({
    name: z.string().trim().min(2).optional(),
    fatherName: nullableText,
    email: nullableText,
    phone: z.string().trim().min(5).optional(),
    whatsapp: nullableText,
    city: nullableText,
    country: z.enum(leadCountryValues).optional(),
    address: nullableText,
    message: z.string().trim().min(1),
    status: z.enum(leadStatusValues),
    departmentId: z.string().trim().min(1).optional(),
    followUpAt: nullableFollowUpDateTime,
    followUpMessage: nullableFollowUpMessage,
    serviceId: nullableServiceId,
    totalAmount: nullableDecimal,
    receivingAmount: nullableDecimal,
  })
)
