import { prisma } from '../../../lib/prisma.js'
import { uploadLeadReceiptToSpaces } from '../../../lib/spaces-storage.js'
import { AppError } from '../../../utils/app-error.js'
import { HTTP_STATUS } from '../../../constant/index.js'
import { ensureLeadAccessService } from './lead.service.js'
import type { CurrentUserRole } from './user.access.js'

export async function listLeadReceiptsService(
  userId: string,
  role: CurrentUserRole | undefined,
  leadId: string,
  allowedScreens?: string[],
) {
  const lead = await ensureLeadAccessService(userId, role, leadId, allowedScreens)

  if (!lead) {
    throw new AppError('Lead not found', HTTP_STATUS.NOT_FOUND)
  }

  const receipts = await prisma.leadReceipt.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      note: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      createdAt: true,
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return receipts.map((r: typeof receipts[number]) => ({
    ...r,
    amount: r.amount != null ? Number(r.amount) : null,
  }))
}

export async function addLeadReceiptService(
  leadId: string,
  uploadedById: string,
  role: CurrentUserRole | undefined,
  amount: number | null,
  note: string | null,
  file: Express.Multer.File | undefined,
  allowedScreens?: string[],
) {
  const lead = await ensureLeadAccessService(uploadedById, role, leadId, allowedScreens)
  if (!lead) throw new AppError('Lead not found', HTTP_STATUS.NOT_FOUND)

  let fileFields: {
    key?: string
    url?: string
    originalName?: string
    mimeType?: string
    size?: number
  } = {}

  if (file) {
    const uploaded = await uploadLeadReceiptToSpaces(leadId, file)
    fileFields = {
      key: uploaded.key,
      url: uploaded.url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }
  }

  const receipt = await prisma.leadReceipt.create({
    data: {
      leadId,
      uploadedById,
      amount: amount != null ? amount : null,
      note: note || null,
      ...fileFields,
    },
    select: {
      id: true,
      amount: true,
      note: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return {
    ...receipt,
    amount: receipt.amount != null ? Number(receipt.amount) : null,
  }
}

export async function deleteLeadReceiptService(
  userId: string,
  role: CurrentUserRole | undefined,
  leadId: string,
  receiptId: string,
  allowedScreens?: string[],
) {
  const lead = await ensureLeadAccessService(userId, role, leadId, allowedScreens)
  if (!lead) throw new AppError('Lead not found', HTTP_STATUS.NOT_FOUND)

  const receipt = await prisma.leadReceipt.findUnique({
    where: { id: receiptId },
    select: { id: true, leadId: true, uploadedById: true },
  })

  if (!receipt || receipt.leadId !== leadId) {
    throw new AppError('Receipt not found', HTTP_STATUS.NOT_FOUND)
  }

  if (role === 'MANAGER_USER' && receipt.uploadedById !== userId) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN)
  }

  await prisma.leadReceipt.delete({ where: { id: receiptId } })
}
