import crypto from 'node:crypto'
import type { Request, Response } from 'express'

import { env } from '../../../config/loadEnv.js'
import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import {
  fetchMetaLead,
  parseMetaFields,
  extractCity,
  extractEmail,
  extractName,
  extractPhone,
} from '../../../lib/meta-api.js'
import {
  generateLeadReferenceNo,
  isPrismaUniqueConstraintError,
  normalizeLeadPhone,
} from '../services/lead.helpers.js'

function verifyMetaSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.META_APP_SECRET) return true
  const expected = `sha256=${crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex')}`
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function metaWebhookVerify(req: Request, res: Response) {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    return res.status(HTTP_STATUS.OK).send(challenge)
  }

  return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' })
}

export async function metaWebhookReceive(req: Request, res: Response) {
  // Respond 200 immediately — Facebook will retry if we're slow
  res.status(HTTP_STATUS.OK).json({ received: true })

  try {
    const rawBody = req.body as Buffer
    const signature = req.headers['x-hub-signature-256'] as string | undefined

    if (signature && !verifyMetaSignature(rawBody, signature)) {
      console.error('[Meta] Invalid webhook signature — ignored')
      return
    }

    const payload = JSON.parse(rawBody.toString()) as {
      object?: string
      entry?: Array<{
        changes?: Array<{
          field: string
          value: { leadgen_id?: string }
        }>
      }>
    }

    if (payload.object !== 'page') return

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue
        const leadgenId = change.value?.leadgen_id
        if (leadgenId) {
          void processMetaLead(leadgenId).catch((err: unknown) => {
            console.error(`[Meta] Failed to process lead ${leadgenId}:`, err)
          })
        }
      }
    }
  } catch (err) {
    console.error('[Meta] Webhook processing error:', err)
  }
}

async function processMetaLead(leadgenId: string): Promise<void> {
  const departmentId = env.META_DEPARTMENT_ID
  if (!departmentId) {
    console.error('[Meta] META_DEPARTMENT_ID is not configured — cannot save lead')
    return
  }

  // Deduplication: skip if already imported
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaWhere: any = { metaLeadId: leadgenId }
  const existing = await prisma.lead.findUnique({ where: metaWhere, select: { id: true } })
  if (existing) {
    console.log(`[Meta] Lead ${leadgenId} already exists — skipping`)
    return
  }

  const metaData = await fetchMetaLead(leadgenId)
  const fields = parseMetaFields(metaData.field_data)

  const name = extractName(fields)
  const rawPhone = extractPhone(fields)
  const phone = normalizeLeadPhone(rawPhone)
  const email = extractEmail(fields)
  const city = extractCity(fields, env.META_DEFAULT_CITY || 'Karachi')

  if (!phone) {
    console.error(`[Meta] Lead ${leadgenId} has no phone number — skipping`)
    return
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, isActive: true },
  })

  if (!department?.isActive) {
    console.error(`[Meta] Department ${departmentId} not found or inactive`)
    return
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: any = {
        referenceNo: generateLeadReferenceNo(),
        name,
        phone,
        whatsapp: phone,
        email,
        city,
        message: 'Lead from Facebook Ads',
        status: 'NEW',
        source: 'META',
        metaLeadId: leadgenId,
        departmentId,
      }
      await prisma.lead.create({ data: createData })
      console.log(`[Meta] Lead created: ${name} (${leadgenId})`)
      return
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        const target = (error as { meta?: { target?: string[] } }).meta?.target ?? []
        if (target.includes('referenceNo')) continue
        // Phone or metaLeadId conflict — already exists
        console.warn(`[Meta] Duplicate on ${target.join(', ')} for lead ${leadgenId}`)
        return
      }
      throw error
    }
  }
}
