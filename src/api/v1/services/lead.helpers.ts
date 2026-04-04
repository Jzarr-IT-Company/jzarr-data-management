export const leadStatusValues = ['NEW', 'IN_PROGRESS', 'CONVERTED', 'NOT_INTERESTED'] as const

export type LeadStatusValue = (typeof leadStatusValues)[number]

type DepartmentSummary = {
  id: string
  name: string
  code: string
  accent: string
}

type PersonSummary = {
  id: string
  name: string
}

export type LeadActivityRecord = {
  id: string
  action: string
  note: string | null
  createdAt: Date
  user: PersonSummary | null
}

export type LeadRecord = {
  id: string
  referenceNo: string
  name: string
  fatherName: string | null
  email: string | null
  phone: string
  whatsapp: string | null
  city: string | null
  address: string | null
  message: string | null
  status: LeadStatusValue
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
  activities?: LeadActivityRecord[]
}

export type LeadDetailRecord = LeadRecord

export type SafeLead = {
  id: string
  referenceNo: string
  name: string
  fatherName: string | null
  email: string | null
  phone: string
  whatsapp: string | null
  city: string | null
  address: string | null
  message: string | null
  status: LeadStatusValue
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
  activities: LeadActivityRecord[]
}

export function toSafeLead(lead: LeadRecord): SafeLead {
  const {
    id,
    referenceNo,
    name,
    fatherName,
    email,
    phone,
    whatsapp,
    city,
    address,
    message,
    status,
    createdAt,
    updatedAt,
    department,
    createdBy,
    updatedBy,
    activities = [],
  } = lead

  return {
    id,
    referenceNo,
    name,
    fatherName,
    email,
    phone,
    whatsapp,
    city,
    address,
    message,
    status,
    createdAt,
    updatedAt,
    department,
    createdBy,
    updatedBy,
    activities,
  }
}

export function normalizeOptionalText(value?: string | null) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

export function normalizeRequiredText(value: string) {
  return value.trim()
}

export function normalizeLeadPhone(phone: string) {
  return phone.replace(/\s+/g, '').trim()
}

export function normalizeLeadStatus(status?: string | null): LeadStatusValue | null {
  if (typeof status !== 'string') {
    return null
  }

  const normalized = status.trim().toUpperCase()

  return leadStatusValues.includes(normalized as LeadStatusValue)
    ? (normalized as LeadStatusValue)
    : null
}

export function generateLeadReferenceNo() {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()

  return `JZL-${timestamp}-${random}`
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )
}

export function isPrismaNotFoundError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
  )
}
