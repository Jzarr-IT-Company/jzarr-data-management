import { z } from 'zod'

import { leadStatusValues } from '../services/lead.helpers.js'

const nullableText = z.string().trim().min(1).nullable().optional()

export const createLeadSchema = z.object({
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
})

export const updateLeadSchema = z.object({
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
})
