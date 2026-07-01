import { env } from '../config/loadEnv.js'
import { AppError } from '../utils/app-error.js'
import { HTTP_STATUS } from '../constant/index.js'

export type MetaFieldData = {
  name: string
  values: string[]
}

export type MetaLeadData = {
  id: string
  field_data: MetaFieldData[]
  created_time: string
}

export async function fetchMetaLead(leadgenId: string): Promise<MetaLeadData> {
  const token = env.META_PAGE_ACCESS_TOKEN
  const version = env.META_API_VERSION

  if (!token) {
    throw new AppError('META_PAGE_ACCESS_TOKEN is not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  const url = `https://graph.facebook.com/${version}/${leadgenId}?fields=field_data,created_time&access_token=${token}`
  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text()
    throw new AppError(`Meta Graph API error: ${text}`, HTTP_STATUS.BAD_GATEWAY)
  }

  return response.json() as Promise<MetaLeadData>
}

export function parseMetaFields(fieldData: MetaFieldData[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of fieldData) {
    result[field.name] = field.values[0] || ''
  }
  return result
}

export function extractName(fields: Record<string, string>): string {
  return (
    fields['full_name'] ||
    fields['name'] ||
    [fields['first_name'], fields['last_name']].filter(Boolean).join(' ') ||
    'Unknown'
  ).trim()
}

export function extractPhone(fields: Record<string, string>): string {
  return (
    fields['phone_number'] ||
    fields['phone'] ||
    fields['mobile_number'] ||
    fields['mobile'] ||
    ''
  ).trim()
}

export function extractEmail(fields: Record<string, string>): string | null {
  return fields['email'] || fields['email_address'] || null
}

export function extractCity(fields: Record<string, string>, fallback: string): string {
  return fields['city'] || fields['location'] || fallback
}
