import { Router } from 'express'
import { metaWebhookVerify, metaWebhookReceive } from '../controller/webhook.controller.js'

export const webhookRouter = Router()

webhookRouter.get('/meta', metaWebhookVerify)
webhookRouter.post('/meta', metaWebhookReceive)
