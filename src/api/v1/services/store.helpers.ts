export const storeReportRangeValues = ['daily', 'weekly', 'monthly'] as const

export type StoreReportRange = (typeof storeReportRangeValues)[number]

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

export type StoreStatRecord = {
  id: string
  statDate: Date
  views: number
  visitors: number
  orders: number
  revenue: unknown
  createdAt: Date
  updatedAt: Date
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
}

export type StoreFileCategory = 'AUDIT' | 'DOCUMENT' | 'PRODUCT_PSD'

export type StoreFileRecord = {
  id: string
  storeId: string
  category: StoreFileCategory
  originalName: string
  mimeType: string
  size: number
  key: string
  url: string
  uploadedBy: PersonSummary | null
  createdAt: Date
}

export type StoreRecord = {
  id: string
  name: string
  url: string
  isActive: boolean
  amazonHolderName: string | null
  sellerAccountGmail: string | null
  sellerAccountPassword: string | null
  sellerAccountAddress: string | null
  userAccountGmail: string | null
  userAccountPassword: string | null
  userManagingMemberName: string | null
  inventory: number | null
  recordDate: Date | null
  assignCode: string | null
  costOfGoods: unknown
  ppcSpending: unknown
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
  files?: StoreFileRecord[]
  stats?: StoreStatRecord[]
  _count?: {
    stats: number
  }
}

export type SafeStoreStat = {
  id: string
  statDate: Date
  views: number
  visitors: number
  orders: number
  revenue: number
  createdAt: Date
  updatedAt: Date
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
}

export type SafeStore = {
  id: string
  name: string
  url: string
  isActive: boolean
  amazonHolderName: string | null
  sellerAccountGmail: string | null
  sellerAccountPassword: string | null
  sellerAccountAddress: string | null
  userAccountGmail: string | null
  userAccountPassword: string | null
  userManagingMemberName: string | null
  inventory: number | null
  recordDate: Date | null
  assignCode: string | null
  costOfGoods: number
  ppcSpending: number
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
  files: StoreFileRecord[]
  statsCount: number
  latestStat: SafeStoreStat | null
  stats: SafeStoreStat[]
}

export type StoreReportRow = {
  label: string
  from: Date
  to: Date
  views: number
  visitors: number
  orders: number
  revenue: number
}

export type StoreReportPayload = {
  store: SafeStore
  range: StoreReportRange
  summary: {
    totalViews: number
    totalVisitors: number
    totalOrders: number
    totalRevenue: number
  }
  rows: StoreReportRow[]
}

export function isPrismaUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )
}

export function normalizeStoreName(value: string) {
  return value.trim()
}

export function normalizeStoreUrl(value: string) {
  return value.trim()
}

export function normalizeStoreDate(value: string | Date) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  date.setUTCHours(0, 0, 0, 0)
  return date
}

function normalizeMoney(value: unknown) {
  const numeric = Number(value ?? 0)

  return Number.isFinite(numeric) ? numeric : 0
}

export function toSafeStoreStat(stat: StoreStatRecord): SafeStoreStat {
  return {
    id: stat.id,
    statDate: stat.statDate,
    views: stat.views,
    visitors: stat.visitors,
    orders: stat.orders,
    revenue: normalizeMoney(stat.revenue),
    createdAt: stat.createdAt,
    updatedAt: stat.updatedAt,
    createdBy: stat.createdBy,
    updatedBy: stat.updatedBy,
  }
}

export function toSafeStore(store: StoreRecord): SafeStore {
  const stats = (store.stats || []).map((stat) => toSafeStoreStat(stat))

  return {
    id: store.id,
    name: store.name,
    url: store.url,
    isActive: store.isActive,
    amazonHolderName: store.amazonHolderName,
    sellerAccountGmail: store.sellerAccountGmail,
    sellerAccountPassword: store.sellerAccountPassword,
    sellerAccountAddress: store.sellerAccountAddress,
    userAccountGmail: store.userAccountGmail,
    userAccountPassword: store.userAccountPassword,
    userManagingMemberName: store.userManagingMemberName,
    inventory: store.inventory,
    recordDate: store.recordDate,
    assignCode: store.assignCode,
    costOfGoods: normalizeMoney(store.costOfGoods),
    ppcSpending: normalizeMoney(store.ppcSpending),
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    department: store.department,
    createdBy: store.createdBy,
    updatedBy: store.updatedBy,
    files: store.files || [],
    statsCount: store._count?.stats ?? stats.length,
    latestStat: stats[0] ?? null,
    stats,
  }
}

function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getWeekStart(date: Date) {
  const start = new Date(date.getTime())
  const day = start.getUTCDay() || 7

  start.setUTCDate(start.getUTCDate() - day + 1)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatWeekLabel(date: Date) {
  return `Week of ${formatDayLabel(date)}`
}

function bucketLabel(date: Date, range: StoreReportRange) {
  if (range === 'weekly') {
    return getUtcDateKey(getWeekStart(date))
  }

  if (range === 'monthly') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }

  return getUtcDateKey(date)
}

function labelForBucket(bucket: string, range: StoreReportRange) {
  if (range === 'weekly') {
    return formatWeekLabel(new Date(`${bucket}T00:00:00.000Z`))
  }

  if (range === 'monthly') {
    const [year, month] = bucket.split('-').map((part) => Number(part))
    return formatMonthLabel(new Date(Date.UTC(year, month - 1, 1)))
  }

  return formatDayLabel(new Date(`${bucket}T00:00:00.000Z`))
}

export function summarizeStoreStats(stats: StoreStatRecord[], range: StoreReportRange) {
  const buckets = new Map<
    string,
    {
      from: Date
      to: Date
      views: number
      visitors: number
      orders: number
      revenue: number
    }
  >()

  stats.forEach((stat) => {
    const bucket = bucketLabel(stat.statDate, range)
    const existing = buckets.get(bucket)

    const currentValue = {
      views: stat.views,
      visitors: stat.visitors,
      orders: stat.orders,
      revenue: normalizeMoney(stat.revenue),
    }

    if (!existing) {
      buckets.set(bucket, {
        from: stat.statDate,
        to: stat.statDate,
        ...currentValue,
      })
      return
    }

    existing.from = existing.from < stat.statDate ? existing.from : stat.statDate
    existing.to = existing.to > stat.statDate ? existing.to : stat.statDate
    existing.views += currentValue.views
    existing.visitors += currentValue.visitors
    existing.orders += currentValue.orders
    existing.revenue += currentValue.revenue
  })

  const rows = Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucket, value]) => ({
      label: labelForBucket(bucket, range),
      from: value.from,
      to: value.to,
      views: value.views,
      visitors: value.visitors,
      orders: value.orders,
      revenue: value.revenue,
    }))

  return rows
}

export function toStoreReportPayload(
  store: SafeStore,
  range: StoreReportRange,
  stats: StoreStatRecord[],
): StoreReportPayload {
  const rows = summarizeStoreStats(stats, range)

  const summary = rows.reduce(
    (accumulator, row) => ({
      totalViews: accumulator.totalViews + row.views,
      totalVisitors: accumulator.totalVisitors + row.visitors,
      totalOrders: accumulator.totalOrders + row.orders,
      totalRevenue: accumulator.totalRevenue + row.revenue,
    }),
    {
      totalViews: 0,
      totalVisitors: 0,
      totalOrders: 0,
      totalRevenue: 0,
    },
  )

  return {
    store,
    range,
    summary,
    rows,
  }
}

function getReportEntityLabel(store: SafeStore) {
  const key = `${store.department.code || ''} ${store.department.name || ''}`.toLowerCase()

  if (key.includes('blogging') || key.includes('bg01')) {
    return 'Website'
  }

  return 'Store'
}

function formatUsdAmount(value: number) {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function buildStoreReportCsv(payload: StoreReportPayload) {
  const entityLabel = getReportEntityLabel(payload.store)
  const lines = [
    [entityLabel, payload.store.name],
    ['Department', payload.store.department.name],
    ['Range', payload.range],
    ['Generated At', new Date().toISOString()],
    [],
    ['Period', 'Views', 'Visitors', 'Orders', 'Revenue'],
    ...payload.rows.map((row) => [
      row.label,
      String(row.views),
      String(row.visitors),
      String(row.orders),
      String(row.revenue.toFixed(2)),
    ]),
  ]

  return lines
    .map((line) =>
      line
        .map((cell) => {
          const value = String(cell ?? '')

          if (/[,"\n]/.test(value)) {
            return `"${value.replaceAll('"', '""')}"`
          }

          return value
        })
        .join(','),
    )
    .join('\n')
}

type PdfFontName = 'F1' | 'F2'

type PdfLine = {
  text: string
  x: number
  y: number
  size?: number
  font?: PdfFontName
}

function escapePdfText(value: string) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?')
}

function buildPdfContent(lines: PdfLine[]) {
  return lines
    .map((line) => {
      const font = line.font || 'F1'
      const size = line.size || 11
      return `BT\n/${font} ${size} Tf\n${line.x} ${line.y} Td\n(${escapePdfText(line.text)}) Tj\nET`
    })
    .join('\n')
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

export function buildStoreReportPdf(payload: StoreReportPayload) {
  const rows = payload.rows.slice(0, 24)
  const lines: PdfLine[] = []
  let y = 742
  const entityLabel = getReportEntityLabel(payload.store)

  const addLine = (text: string, options: Partial<PdfLine> = {}) => {
    lines.push({
      text,
      x: options.x ?? 72,
      y,
      size: options.size ?? 11,
      font: options.font ?? 'F1',
    })
    y -= options.size ? Math.max(14, options.size + 4) : 16
  }

  const drawRule = (currentY: number, x1 = 72, x2 = 540) => {
    lines.push({
      text: `__line__${x1}:${currentY}:${x2}`,
      x: 0,
      y: 0,
      size: 0,
      font: 'F1',
    })
  }

  const fitText = (value: string, maxLength: number) => {
    const text = String(value || '')

    if (text.length <= maxLength) {
      return text
    }

    return maxLength <= 3 ? text.slice(0, maxLength) : `${text.slice(0, maxLength - 3)}...`
  }

  addLine(`${entityLabel} Report`, { size: 18, font: 'F2' })
  addLine(`${entityLabel}: ${payload.store.name}`)
  addLine(`Department: ${payload.store.department.name}`)
  addLine(`Range: ${payload.range}`)
  addLine(`Generated At: ${new Date().toISOString()}`)

  y -= 8
  addLine('Summary', { size: 13, font: 'F2' })
  addLine(`Total Views: ${payload.summary.totalViews}`)
  addLine(`Total Visitors: ${payload.summary.totalVisitors}`)
  addLine(`Total Orders: ${payload.summary.totalOrders}`)
  addLine(`Total Revenue: ${formatUsdAmount(payload.summary.totalRevenue)}`)

  y -= 10
  const headerY = y
  const colX = [72, 210, 300, 390, 480]
  const headers = ['Period', 'Views', 'Visitors', 'Orders', 'Revenue']

  headers.forEach((header, index) => {
    lines.push({
      text: header,
      x: colX[index],
      y: headerY,
      size: 12,
      font: 'F2',
    })
  })

  drawRule(headerY + 10)

  let rowY = headerY - 18
  rows.forEach((row) => {
    const values = [
      fitText(row.label, 18),
      String(row.views),
      String(row.visitors),
      String(row.orders),
      formatUsdAmount(row.revenue),
    ]

    values.forEach((value, index) => {
      lines.push({
        text: value,
        x: colX[index],
        y: rowY,
        size: 10,
        font: 'F1',
      })
    })

    drawRule(rowY - 3)
    rowY -= 17
  })

  if (payload.rows.length > rows.length) {
    addLine(`Showing first ${rows.length} of ${payload.rows.length} rows only.`, { size: 10 })
  }

  const content = buildPdfContent(lines.filter((line) => !line.text.startsWith('__line__')))
  return buildPdfDocument(content)
}
