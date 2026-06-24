import { prisma } from '../../../lib/prisma.js'
import { uploadLeadReceiptToSpaces } from '../../../lib/spaces-storage.js'
import { AppError } from '../../../utils/app-error.js'
import { HTTP_STATUS } from '../../../constant/index.js'

export async function listLeadReceiptsService(leadId: string) {
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
  amount: number | null,
  note: string | null,
  file: Express.Multer.File | undefined,
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
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

export async function deleteLeadReceiptService(leadId: string, receiptId: string) {
  const receipt = await prisma.leadReceipt.findUnique({
    where: { id: receiptId },
    select: { id: true, leadId: true },
  })

  if (!receipt || receipt.leadId !== leadId) {
    throw new AppError('Receipt not found', HTTP_STATUS.NOT_FOUND)
  }

  await prisma.leadReceipt.delete({ where: { id: receiptId } })
}
