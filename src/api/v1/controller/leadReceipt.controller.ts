import type { Request, Response } from 'express'
import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  listLeadReceiptsService,
  addLeadReceiptService,
  deleteLeadReceiptService,
} from '../services/leadReceipt.service.js'

function getParam(req: Request, key: string): string | undefined {
  const value = req.params[key]
  return typeof value === 'string' ? value.trim() : undefined
}

export async function listLeadReceiptsController(req: Request, res: Response) {
  const leadId = getParam(req, 'leadId')
  if (!leadId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }
  const receipts = await listLeadReceiptsService(leadId)
  return res.status(HTTP_STATUS.OK).json(successResponse('Receipts fetched', receipts))
}

export async function addLeadReceiptController(req: Request, res: Response) {
  const leadId = getParam(req, 'leadId')
  if (!leadId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse('Lead id is required', HTTP_STATUS.BAD_REQUEST))
  }
  const userId = req.user!.id
  const amount = req.body.amount != null && req.body.amount !== '' ? Number(req.body.amount) : null
  const note: string | null = req.body.note || null
  const file = req.file

  const receipt = await addLeadReceiptService(leadId, userId, amount, note, file)
  return res.status(HTTP_STATUS.CREATED).json(successResponse('Receipt added', receipt))
}

export async function deleteLeadReceiptController(req: Request, res: Response) {
  const leadId = getParam(req, 'leadId')
  const receiptId = getParam(req, 'receiptId')
  if (!leadId || !receiptId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse('Invalid params', HTTP_STATUS.BAD_REQUEST))
  }
  await deleteLeadReceiptService(leadId, receiptId)
  return res.status(HTTP_STATUS.OK).json(successResponse('Receipt deleted'))
}
