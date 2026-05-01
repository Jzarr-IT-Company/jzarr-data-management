import { HTTP_STATUS } from '../../../constant/index.js'
import { AppError } from '../../../utils/app-error.js'
import { type SafeLead } from './lead.helpers.js'
import { leadStatusValues, type LeadStatusValue } from './lead.helpers.js'

export type ReportQuery = {
  search?: string
  status?: string
  departmentId?: string
  createdById?: string
  fromDate?: string
  toDate?: string
  page?: string
  limit?: string
}

export type ReportFilters = {
  search?: string
  status?: LeadStatusValue
  departmentId?: string
  createdById?: string
  fromDate?: Date
  toDate?: Date
  page: number
  limit: number
}

type ScopedLeadWhere = Record<string, unknown>

type ReportDepartment = {
  id: string
  name: string
  code: string
  accent: string
  isActive?: boolean
}

export type LeadReportPayload = {
  filters: ReportFilters
  summary: {
    totalLeads: number
    newLeads: number
    inProgressLeads: number
    convertedLeads: number
    notInterestedLeads: number
    departmentCount: number
  }
  departments: ReportDepartment[]
  leads: SafeLead[]
}

export function normalizeReportStatus(status?: string | null): LeadStatusValue | null {
  if (typeof status !== 'string') {
    return null
  }

  const normalized = status.trim().toUpperCase().replace(/\s+/g, '_')
  const statusAlias = normalized === 'NEW_LEAD' ? 'NEW' : normalized

  return leadStatusValues.includes(statusAlias as LeadStatusValue)
    ? (statusAlias as LeadStatusValue)
    : null
}

export function parseReportDate(value?: string | null) {
  if (typeof value !== 'string') {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export function buildReportFilters(query: ReportQuery): ReportFilters {
  const status = normalizeReportStatus(query.status)
  const fromDate = parseReportDate(query.fromDate)
  const toDate = parseReportDate(query.toDate)
  const page = parsePositiveInteger(query.page, 1)
  const limit = Math.min(parsePositiveInteger(query.limit, 20), 100)

  return {
    search: typeof query.search === 'string' ? query.search.trim() || undefined : undefined,
    status: status ?? undefined,
    departmentId:
      typeof query.departmentId === 'string' ? query.departmentId.trim() || undefined : undefined,
    createdById:
      typeof query.createdById === 'string' ? query.createdById.trim() || undefined : undefined,
    fromDate: fromDate ?? undefined,
    toDate: toDate ?? undefined,
    page,
    limit,
  }
}

export function buildScopedLeadWhere(
  filters: ReportFilters,
  accessibleDepartmentIds: string[] | null
) {
  const where: ScopedLeadWhere = {}

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.departmentId) {
    if (accessibleDepartmentIds && !accessibleDepartmentIds.includes(filters.departmentId)) {
      throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
    }

    where.departmentId = filters.departmentId
  } else if (accessibleDepartmentIds) {
    where.departmentId = {
      in: accessibleDepartmentIds,
    }
  }

  if (filters.createdById) {
    where.createdById = filters.createdById
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: filters.fromDate } : {}),
      ...(filters.toDate ? { lte: filters.toDate } : {}),
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' as const } },
      { referenceNo: { contains: filters.search, mode: 'insensitive' as const } },
      { phone: { contains: filters.search, mode: 'insensitive' as const } },
      { email: { contains: filters.search, mode: 'insensitive' as const } },
      { city: { contains: filters.search, mode: 'insensitive' as const } },
    ]
  }

  return where
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '')

  if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function buildCsvLine(values: unknown[]) {
  return values.map(escapeCsvCell).join(',')
}

function normalizePdfText(value: string) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?')
}

function buildPdfDocument(content: string) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ]

  let output = '%PDF-1.4\n'
  const offsets = ['0000000000 65535 f \n']

  objects.forEach((object, index) => {
    offsets.push(`${String(Buffer.byteLength(output, 'utf8')).padStart(10, '0')} 00000 n \n`)
    output += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(output, 'utf8')
  output += `xref\n0 ${objects.length + 1}\n`
  output += offsets.join('')
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  output += `startxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(output, 'utf8')
}

function formatDepartmentLabel(department: ReportDepartment | undefined, fallback = 'all-departments') {
  const label = department?.name || fallback

  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildLeadReportCsv(report: LeadReportPayload) {
  const headerLine = buildCsvLine([
    'referenceNo',
    'departmentName',
    'name',
    'fatherName',
    'email',
    'phone',
    'whatsapp',
    'city',
    'address',
    'message',
    'status',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ])

  const summaryLines = [
    buildCsvLine(['Report', 'Lead Report']),
    buildCsvLine(['Generated At', new Date().toISOString()]),
    buildCsvLine(['Department Count', String(report.summary.departmentCount)]),
    buildCsvLine(['Total Leads', String(report.summary.totalLeads)]),
    buildCsvLine(['New Leads', String(report.summary.newLeads)]),
    buildCsvLine(['In Progress Leads', String(report.summary.inProgressLeads)]),
    buildCsvLine(['Converted Leads', String(report.summary.convertedLeads)]),
    buildCsvLine(['Not Interested Leads', String(report.summary.notInterestedLeads)]),
    '',
    headerLine,
  ]

  const bodyLines = report.leads.map((lead) =>
    buildCsvLine([
      lead.referenceNo,
      lead.department.name,
      lead.name,
      lead.fatherName || '',
      lead.email || '',
      lead.phone,
      lead.whatsapp || '',
      lead.city || '',
      lead.address || '',
      lead.message || '',
      lead.status,
      lead.createdBy?.name || '',
      lead.updatedBy?.name || '',
      lead.createdAt.toISOString(),
      lead.updatedAt.toISOString(),
    ]),
  )

  return ['\uFEFF' + summaryLines[0], ...summaryLines.slice(1), ...bodyLines].join('\r\n')
}

function fitPdfText(value: string, maxLength: number) {
  const text = String(value || '')

  if (text.length <= maxLength) {
    return text
  }

  if (maxLength <= 1) {
    return '...'
  }

  return `${text.slice(0, maxLength - 1)}...`
}

export function buildLeadReportPdf(report: LeadReportPayload) {
  const rows = report.leads.slice(0, 24)
  const commands: string[] = []
  let y = 742

  const addText = (
    text: string,
    x: number,
    y: number,
    options: { size?: number; font?: 'F1' | 'F2' } = {},
  ) => {
    const font = options.font || 'F1'
    const size = options.size || 11
    commands.push(
      `BT\n/${font} ${size} Tf\n${x} ${y} Td\n(${normalizePdfText(text)}) Tj\nET`,
    )
  }

  const drawRule = (y: number, x1 = 48, x2 = 564) => {
    commands.push(`0.5 w\n${x1} ${y} m\n${x2} ${y} l\nS`)
  }

  const addLine = (
    text: string,
    options: { x?: number; size?: number; font?: 'F1' | 'F2' } = {},
  ) => {
    addText(text, options.x ?? 48, y, options)
    y -= options.size ? Math.max(14, options.size + 4) : 16
  }

  const departmentLabel =
    (report.filters.departmentId
      ? report.departments.find((department) => department.id === report.filters.departmentId)
      : undefined) || (report.departments.length === 1 ? report.departments[0] : undefined)

  addLine('Lead Report', { size: 18, font: 'F2' })
  addLine(`Department: ${departmentLabel?.name || 'All departments'}`)
  addLine(`Generated At: ${new Date().toISOString()}`)
  addLine(`Total Leads: ${report.summary.totalLeads}`)
  addLine(`New Leads: ${report.summary.newLeads}`)
  addLine(`In Progress Leads: ${report.summary.inProgressLeads}`)
  addLine(`Converted Leads: ${report.summary.convertedLeads}`)
  addLine(`Not Interested Leads: ${report.summary.notInterestedLeads}`)

  y -= 8
  const headerY = y
  const tableTop = headerY + 12
  const colX = [48, 148, 250, 374, 444, 514]
  const headers = ['Reference', 'Department', 'Name', 'Status', 'City', 'Created At']

  headers.forEach((header, index) => {
    addText(header, colX[index], headerY, { size: 12, font: 'F2' })
  })

  drawRule(tableTop)

  let rowY = headerY - 16
  rows.forEach((lead) => {
    const values = [
      fitPdfText(lead.referenceNo, 18),
      fitPdfText(lead.department.name, 18),
      fitPdfText(lead.name, 22),
      fitPdfText(lead.status, 12),
      fitPdfText(lead.city || '-', 12),
      fitPdfText(lead.createdAt.toISOString().slice(0, 10), 12),
    ]

    values.forEach((value, index) => {
      addText(value, colX[index], rowY, { size: 10 })
    })

    rowY -= 16
    drawRule(rowY + 4)
  })

  if (report.leads.length > rows.length) {
    addText(`Showing first ${rows.length} of ${report.leads.length} rows only.`, 48, rowY - 4, {
      size: 10,
    })
  }

  const content = commands.join('\n')
  return buildPdfDocument(content)
}

export function buildLeadReportFilename(report: LeadReportPayload, suffix: string, extension: 'csv' | 'pdf') {
  const selectedDepartment =
    (report.filters.departmentId
      ? report.departments.find((department) => department.id === report.filters.departmentId)
      : undefined) || (report.departments.length === 1 ? report.departments[0] : undefined)

  const departmentLabel = formatDepartmentLabel(selectedDepartment)
  const today = new Date().toISOString().slice(0, 10)
  const normalizedSuffix = suffix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${departmentLabel}-${normalizedSuffix}-${today}.${extension}`
}

