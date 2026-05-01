import { z } from 'zod'

import { leadStatusValues } from '../services/lead.helpers.js'

const nullableText = z.string().trim().min(1).nullable().optional()
const followUpDateTime = z.string().datetime({ offset: true })

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

export const createLeadSchema = withFollowUpValidation(
  z.object({
  name: z.string().trim().min(2),
  fatherName: nullableText,
  email: nullableText,
  phone: z.string().trim().min(5),
  whatsapp: nullableText,
  city: nullableText,
  address: nullableText,
  message: nullableText,
  status: z.enum(leadStatusValues).optional(),
  departmentId: z.string().trim().min(1),
  followUpAt: followUpDateTime.optional(),
  followUpMessage: z.string().trim().min(1).optional(),
  })
)

export const updateLeadSchema = withFollowUpValidation(
  z.object({
  name: z.string().trim().min(2).optional(),
  fatherName: nullableText,
  email: nullableText,
  phone: z.string().trim().min(5).optional(),
  whatsapp: nullableText,
  city: nullableText,
  address: nullableText,
  message: z.string().trim().min(1),
  status: z.enum(leadStatusValues),
  departmentId: z.string().trim().min(1).optional(),
  followUpAt: followUpDateTime.optional(),
  followUpMessage: z.string().trim().min(1).optional(),
  })
)
