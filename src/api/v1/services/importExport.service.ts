import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'
import { createLeadService } from './lead.service.js'
import { getAccessibleDepartmentIds, isAdminRole } from './dashboard.helpers.js'
import { buildReportFilters, buildScopedLeadWhere, type ReportQuery } from './report.helpers.js'
import {
  buildHeaderIndexMap,
  LEAD_CSV_EXPORT_HEADERS,
  parseCsvText,
  normalizeHeaderName,
  readCsvValue,
  rowsToCsv,
} from './importExport.helpers.js'
import {
  normalizeLeadPhone,
  normalizeLeadStatus,
  normalizeOptionalText,
  normalizeRequiredText,
  type LeadStatusValue,
} from './lead.helpers.js'

type CurrentUserRole = 'ADMIN' | 'MANAGER' | 'MANAGER_USER' | 'SUB_ADMIN'

type ImportRowError = {
  row: number
  message: string
}

type ImportLeadsResult = {
  totalRows: number
  importedRows: number
  skippedRows: number
  errors: ImportRowError[]
}

const EXPORT_SELECT = {
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
      code: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      name: true,
    },
  },
  updatedBy: {
    select: {
      name: true,
    },
  },
} as const

function requireManagerAccess(accessibleDepartmentIds: string[] | null) {
  if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length === 0) {
    throw new AppError('Unauthorized', HTTP_STATUS.UNAUTHORIZED)
  }
}

async function getScopedDepartments(userId: string, role?: CurrentUserRole) {
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(userId, role)

  if (role !== 'ADMIN') {
    requireManagerAccess(accessibleDepartmentIds)
  }

  return accessibleDepartmentIds
}

function buildImportLeadPayload(row: string[], headerIndex: Record<string, number>) {
  return {
    name: normalizeRequiredText(readCsvValue(row, headerIndex, 'name') ?? ''),
    fatherName: normalizeOptionalText(readCsvValue(row, headerIndex, 'fatherName')),
    email: normalizeOptionalText(readCsvValue(row, headerIndex, 'email')),
    phone: normalizeLeadPhone(normalizeRequiredText(readCsvValue(row, headerIndex, 'phone') ?? '')),
    whatsapp: normalizeOptionalText(readCsvValue(row, headerIndex, 'whatsapp')),
    city: normalizeOptionalText(readCsvValue(row, headerIndex, 'city')),
    address: normalizeOptionalText(readCsvValue(row, headerIndex, 'address')),
    message: normalizeOptionalText(readCsvValue(row, headerIndex, 'message')),
    status: normalizeLeadStatus(readCsvValue(row, headerIndex, 'status')) ?? 'NEW',
    departmentCode: normalizeRequiredText(readCsvValue(row, headerIndex, 'departmentCode') ?? ''),
  }
}

function buildExportFilters(query: ReportQuery, accessibleDepartmentIds: string[] | null) {
  const filters = buildReportFilters(query)

  if (accessibleDepartmentIds && filters.departmentId && !accessibleDepartmentIds.includes(filters.departmentId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  return buildScopedLeadWhere(filters, accessibleDepartmentIds)
}

export async function exportLeadsCsvService(
  userId: string,
  role: CurrentUserRole | undefined,
  query?: ReportQuery
) {
  const accessibleDepartmentIds = await getScopedDepartments(userId, role)
  const where = buildExportFilters(query ?? {}, accessibleDepartmentIds)
  const isAdmin = isAdminRole(role)

  const rows = await prisma.lead.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    select: EXPORT_SELECT,
  })

  const csvRows = rows.map((row) => [
    row.referenceNo,
    row.name,
    row.fatherName,
    row.email,
    row.phone,
    row.whatsapp,
    row.city,
    row.address,
    row.message,
    row.status,
    row.department.code,
    row.department.name,
    row.createdBy?.name ?? '',
    row.updatedBy?.name ?? '',
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
  ])

  return {
    filename: `leads-export-${isAdmin ? 'admin' : 'manager'}.csv`,
    csv: rowsToCsv(LEAD_CSV_EXPORT_HEADERS, csvRows),
    totalRows: rows.length,
  }
}

export async function importLeadsCsvService(
  userId: string,
  role: CurrentUserRole | undefined,
  csvText: string
): Promise<ImportLeadsResult> {
  const accessibleDepartmentIds = await getScopedDepartments(userId, role)
  const { headers, rows } = parseCsvText(csvText)
  const headerIndex = buildHeaderIndexMap(headers)
  const requiredHeaders = ['name', 'phone', 'departmentCode']
  const missingHeaders = requiredHeaders.filter(
    (header) => headerIndex[normalizeHeaderName(header)] === undefined
  )

  if (missingHeaders.length > 0) {
    throw new AppError(
      `Missing required CSV columns: ${missingHeaders.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST
    )
  }

  let importedRows = 0
  let skippedRows = 0
  const errors: ImportRowError[] = []

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2

    try {
      const payload = buildImportLeadPayload(row, headerIndex)

      if (!payload.name || !payload.phone || !payload.departmentCode) {
        throw new AppError('Missing required values in row', HTTP_STATUS.BAD_REQUEST)
      }

      const department = await prisma.department.findUnique({
        where: {
          code: payload.departmentCode,
        },
        select: {
          id: true,
          code: true,
          isActive: true,
        },
      })

      if (!department || !department.isActive) {
        throw new AppError('Department not found or inactive', HTTP_STATUS.BAD_REQUEST)
      }

      if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(department.id)) {
        throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
      }

      await createLeadService(userId, role, {
        name: payload.name,
        fatherName: payload.fatherName,
        email: payload.email,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        city: payload.city,
        address: payload.address,
        message: payload.message,
        status: payload.status as LeadStatusValue,
        departmentId: department.id,
      })

      importedRows += 1
    } catch (error) {
      skippedRows += 1
      errors.push({
        row: rowNumber,
        message: error instanceof AppError ? error.message : 'Failed to import row',
      })
    }
  }

  return {
    totalRows: rows.length,
    importedRows,
    skippedRows,
    errors,
  }
}
