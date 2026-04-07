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

export type StoreRecord = {
  id: string
  name: string
  url: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
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
  createdAt: Date
  updatedAt: Date
  department: DepartmentSummary
  createdBy: PersonSummary | null
  updatedBy: PersonSummary | null
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
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    department: store.department,
    createdBy: store.createdBy,
    updatedBy: store.updatedBy,
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

export function buildStoreReportCsv(payload: StoreReportPayload) {
  const lines = [
    ['Store', payload.store.name],
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
