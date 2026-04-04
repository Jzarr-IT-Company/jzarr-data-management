import { Prisma } from '@prisma/client'

import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import {
  generateLeadReferenceNo,
  isPrismaUniqueConstraintError,
  normalizeLeadPhone,
  normalizeLeadStatus,
  normalizeOptionalText,
  normalizeRequiredText,
  toSafeLead,
  type LeadRecord,
  type LeadStatusValue,
  leadStatusValues,
} from './lead.helpers.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER'

type LeadListQuery = {
  search?: string
  status?: string
  departmentId?: string
}

type LeadPayload = {
  name: string
  fatherName?: string | null
  email?: string | null
  phone: string
  whatsapp?: string | null
  city?: string | null
  address?: string | null
  message?: string | null
  status?: LeadStatusValue
  departmentId: string
}

type UpdateLeadPayload = {
  status?: LeadStatusValue
  message?: string | null
}

type LeadCreatePayload = {
  name: string
  fatherName: string | null
  email: string | null
  phone: string
  whatsapp: string | null
  city: string | null
  address: string | null
  message: string | null
  status: LeadStatusValue
  departmentId: string
  createdById: string
  updatedById: string
}

const LEAD_SELECT = {
  id: true,
  referenceNo: true,
  name: true,
  fatherName: true,
  email: true,
  phone: true,
  whatsapp: true,
  city: true,
  address: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
      accent: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
    },
  },
  activities: {
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      action: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const

function isAdmin(role?: CurrentUserRole) {
  return role === 'ADMIN'
}

async function getAccessibleDepartmentIds(userId: string, role?: CurrentUserRole) {
  if (isAdmin(role)) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      status: true,
      managedDepartments: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }

  return user.managedDepartments.map((department: { id: string }) => department.id)
}

async function ensureLeadDepartmentAccess(
  userId: string,
  role: CurrentUserRole | undefined,
  departmentId: string
) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  const department = await prisma.department.findUnique({
    where: {
      id: departmentId,
    },
    select: {
      id: true,
      isActive: true,
    },
  })

  if (!department || !department.isActive) {
    throw new AppError('Department not found or inactive', HTTP_STATUS.BAD_REQUEST)
  }

  if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(departmentId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }
}

async function findLeadById(leadId: string): Promise<LeadRecord | null> {
  return prisma.lead.findUnique({
    where: {
      id: leadId,
    },
    select: LEAD_SELECT,
  }) as Promise<LeadRecord | null>
}

function buildLeadWhereClause(query: LeadListQuery, accessibleDepartmentIds: string[] | null) {
  const where: Record<string, unknown> = {}
  const status = normalizeLeadStatus(query.status)
  const search = query.search?.trim()
  const departmentId = query.departmentId?.trim()

  if (query.status && !status) {
    throw new AppError('Invalid lead status', HTTP_STATUS.BAD_REQUEST)
  }

  if (departmentId) {
    if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(departmentId)) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
    }

    where.departmentId = departmentId
  } else if (accessibleDepartmentIds) {
    where.departmentId = {
      in: accessibleDepartmentIds,
    }
  }

  if (status) {
    where.status = status
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { referenceNo: { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
      { city: { contains: search, mode: 'insensitive' as const } },
    ]
  }

  return where
}

type LeadTransactionClient = {
  lead: Prisma.TransactionClient['lead']
  leadActivity: Prisma.TransactionClient['leadActivity']
}

async function createLeadActivity(
  client: LeadTransactionClient,
  leadId: string,
  userId: string | null,
  action: string,
  note?: string
) {
  await client.leadActivity.create({
    data: {
      leadId,
      userId,
      action,
      note,
    },
  })
}

async function createLeadWithReference(
  client: LeadTransactionClient,
  data: LeadCreatePayload
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createData = {
        ...data,
        referenceNo: generateLeadReferenceNo(),
      } as unknown as Parameters<Prisma.TransactionClient['lead']['create']>[0]['data']

      return (await client.lead.create({
        data: createData,
        select: LEAD_SELECT,
      })) as unknown as LeadRecord
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        const target = (error as { meta?: { target?: string[] } }).meta?.target ?? []

        if (target.includes('referenceNo')) {
          continue
        }
      }

      throw error
    }
  }

  throw new AppError('Could not generate a unique lead reference number', HTTP_STATUS.CONFLICT)
}

function normalizeLeadCreatePayload(payload: LeadPayload) {
  return {
    name: normalizeRequiredText(payload.name),
    fatherName: normalizeOptionalText(payload.fatherName),
    email: normalizeOptionalText(payload.email),
    phone: normalizeLeadPhone(payload.phone),
    whatsapp: normalizeOptionalText(payload.whatsapp),
    city: normalizeOptionalText(payload.city),
    address: normalizeOptionalText(payload.address),
    message: normalizeOptionalText(payload.message),
    status: payload.status ?? 'NEW',
    departmentId: payload.departmentId,
  }
}

function normalizeLeadUpdatePayload(payload: UpdateLeadPayload, currentLead: LeadRecord) {
  return {
    status: payload.status ?? currentLead.status,
    message: normalizeRequiredText(payload.message ?? currentLead.message ?? ''),
  }
}

function buildLeadHistoryEntry(currentLead: LeadRecord, nextStatus: LeadStatusValue, message: string) {
  const historyParts: string[] = []
  let action = 'UPDATED'

  if (nextStatus !== currentLead.status) {
    historyParts.push(`Status changed to ${nextStatus.replaceAll('_', ' ')}`)
    action = 'STATUS_UPDATED'
  }

  if (message !== (currentLead.message ?? '')) {
    historyParts.push(message)
    action = action === 'STATUS_UPDATED' ? 'STATUS_AND_MESSAGE_UPDATED' : 'MESSAGE_UPDATED'
  }

  return {
    action,
    note: historyParts.length > 0 ? historyParts.join('\n\n') : 'Lead updated',
  }
}

export async function listLeadsService(
  userId: string,
  role: CurrentUserRole | undefined,
  query: LeadListQuery
) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)
  const where = buildLeadWhereClause(query, accessibleDepartmentIds)

  const leads = await prisma.lead.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    select: LEAD_SELECT,
  })

  return leads.map((lead: LeadRecord) => toSafeLead(lead))
}

export async function getLeadService(userId: string, role: CurrentUserRole | undefined, leadId: string) {
  const lead = await findLeadById(leadId)

  if (!lead) {
    return null
  }

  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(lead.department.id)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  return toSafeLead(lead)
}

export async function createLeadService(
  userId: string,
  role: CurrentUserRole | undefined,
  payload: LeadPayload
) {
  const normalizedPayload = normalizeLeadCreatePayload(payload)

  if (!leadStatusValues.includes(normalizedPayload.status)) {
    throw new AppError('Invalid lead status', HTTP_STATUS.BAD_REQUEST)
  }

  await ensureLeadDepartmentAccess(userId, role, normalizedPayload.departmentId)

  try {
    const lead = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const createdLead = await createLeadWithReference(transaction, {
        ...normalizedPayload,
        createdById: userId,
        updatedById: userId,
      })

      await createLeadActivity(transaction, createdLead.id, userId, 'CREATED', 'Lead created')

      return createdLead
    })

    return toSafeLead(lead as unknown as LeadRecord)
  } catch (error: unknown) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError('A lead with this phone already exists', HTTP_STATUS.CONFLICT)
    }

    throw error
  }
}

export async function updateLeadService(
  userId: string,
  role: CurrentUserRole | undefined,
  leadId: string,
  payload: UpdateLeadPayload
) {
  const lead = await findLeadById(leadId)

  if (!lead) {
    return null
  }

  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(lead.department.id)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  const normalizedPayload = normalizeLeadUpdatePayload(payload, lead)

  if (!leadStatusValues.includes(normalizedPayload.status)) {
    throw new AppError('Invalid lead status', HTTP_STATUS.BAD_REQUEST)
  }

  try {
    const updatedLead = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const leadRecord = await transaction.lead.update({
        where: {
          id: leadId,
        },
        data: {
          message: normalizedPayload.message,
          status: normalizedPayload.status,
          updatedById: userId,
        },
        select: LEAD_SELECT,
      })

      const historyEntry = buildLeadHistoryEntry(
        lead,
        normalizedPayload.status,
        normalizedPayload.message,
      )

      await createLeadActivity(
        transaction,
        leadRecord.id,
        userId,
        historyEntry.action,
        historyEntry.note,
      )

      return leadRecord
    })

    return toSafeLead(updatedLead as unknown as LeadRecord)
  } catch (error: unknown) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError('A lead with this phone already exists', HTTP_STATUS.CONFLICT)
    }

    throw error
  }
}

export async function deleteLeadService(userId: string, role: CurrentUserRole | undefined, leadId: string) {
  const lead = await findLeadById(leadId)

  if (!lead) {
    return null
  }

  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(lead.department.id)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  await prisma.lead.delete({
    where: {
      id: leadId,
    },
  })

  return true
}
