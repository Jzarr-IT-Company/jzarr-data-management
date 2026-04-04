export const LEAD_CSV_EXPORT_HEADERS = [
  'referenceNo',
  'name',
  'fatherName',
  'email',
  'phone',
  'whatsapp',
  'city',
  'address',
  'message',
  'status',
  'departmentCode',
  'departmentName',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
] as const

export const LEAD_CSV_IMPORT_HEADERS = [
  'name',
  'fatherName',
  'email',
  'phone',
  'whatsapp',
  'city',
  'address',
  'message',
  'status',
  'departmentCode',
] as const

export type CsvTable = {
  headers: string[]
  rows: string[][]
}

export function normalizeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

export function csvEscapeCell(value: unknown) {
  const text = normalizeCsvCell(value)

  if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export function rowsToCsv(headers: readonly string[], rows: unknown[][]) {
  const headerLine = headers.map(csvEscapeCell).join(',')
  const bodyLines = rows.map((row) => row.map(csvEscapeCell).join(','))

  return ['\uFEFF' + headerLine, ...bodyLines].join('\r\n')
}

export function parseCsvText(csvText: string): CsvTable {
  const text = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"'
        index += 1
        continue
      }

      if (char === '"') {
        inQuotes = false
        continue
      }

      currentCell += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if (char === '\n') {
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  const [headers = [], ...bodyRows] = rows

  return {
    headers,
    rows: bodyRows.filter((row) => row.some((cell) => cell.trim().length > 0)),
  }
}

export function normalizeHeaderName(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

export function buildHeaderIndexMap(headers: string[]) {
  return headers.reduce<Record<string, number>>((accumulator, header, index) => {
    accumulator[normalizeHeaderName(header)] = index
    return accumulator
  }, {})
}

export function readCsvValue(row: string[], headerIndex: Record<string, number>, headerName: string) {
  const index = headerIndex[normalizeHeaderName(headerName)]

  if (index === undefined) {
    return undefined
  }

  return row[index]
}
