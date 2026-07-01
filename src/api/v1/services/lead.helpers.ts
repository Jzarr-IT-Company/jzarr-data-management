export const leadStatusValues = ['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'NOT_INTERESTED'] as const

export type LeadStatusValue = (typeof leadStatusValues)[number]

export const leadSourceValues = ['MANUAL', 'META', 'WHATSAPP', 'EMAIL', 'WEBSITE', 'REFERRAL', 'OTHER'] as const

export type LeadSourceValue = (typeof leadSourceValues)[number]

type DepartmentSummary = {
  id: string
  name: string
  code: string
  accent: string
}

type PersonSummary = {
  id: string
  name: string
  email: string | null
}

type AssignedPersonSummary = PersonSummary & {
  role: string
}

export type LeadActivityRecord = {
  id: string
  action: string
  note: string | null
  createdAt: Date
  user: PersonSummary | null
}

type ServiceSummary = {
  id: string
  name: string
}

export type LeadAssignmentRecord = {
  id: string
  leadId: string
  assignedToId: string
  assignedById: string
  note: string | null
  createdAt: Date
  assignedTo: PersonSummary
  assignedBy: PersonSummary
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
  source: LeadSourceValue
  metaLeadId: string | null
  followUpAt: Date | null
  followUpMessage: string | null
  followUpNotifiedAt: Date | null
  followUpCreatedById: string | null
  assignedToId: string | null
  serviceId: string | null
  totalAmount: number | null
  receivingAmount: number | null
  pendingAmount: number | null
  createdAt: Date
  updatedAt: Date
  createdById: string | null
  department: DepartmentSummary
  service: ServiceSummary | null
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
  followUpCreatedBy: PersonSummary | null
  assignedTo: AssignedPersonSummary | null
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
  source: LeadSourceValue
  metaLeadId: string | null
  followUpAt: Date | null
  followUpMessage: string | null
  followUpNotifiedAt: Date | null
  followUpCreatedById: string | null
  assignedToId: string | null
  assignedTo: AssignedPersonSummary | null
  serviceId: string | null
  totalAmount: number | null
  receivingAmount: number | null
  pendingAmount: number | null
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  service: ServiceSummary | null
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
  followUpCreatedBy: PersonSummary | null
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
    source,
    metaLeadId,
    followUpAt,
    followUpMessage,
    followUpNotifiedAt,
    followUpCreatedById,
    assignedToId,
    assignedTo,
    serviceId,
    totalAmount,
    receivingAmount,
    pendingAmount,
    createdAt,
    updatedAt,
    department,
    service,
    createdBy,
    updatedBy,
    followUpCreatedBy,
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
    source,
    metaLeadId: metaLeadId ?? null,
    followUpAt,
    followUpMessage,
    followUpNotifiedAt,
    followUpCreatedById,
    assignedToId: assignedToId ?? null,
    assignedTo: assignedTo ?? null,
    serviceId: serviceId ?? null,
    totalAmount: totalAmount ?? null,
    receivingAmount: receivingAmount ?? null,
    pendingAmount: pendingAmount ?? null,
    createdAt,
    updatedAt,
    department,
    service: service ?? null,
    createdBy,
    updatedBy,
    followUpCreatedBy,
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
