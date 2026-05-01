import { logger } from '../../../config/logger.js'
import { prisma } from '../../../lib/prisma.js'
import { emitNotificationCreatedEvent } from '../../../socket/task-socket.js'

type LeadReminderCreator = {
  id: string
  role: 'ADMIN' | 'MANAGER' | 'MANAGER_USER' | 'SUB_ADMIN'
  status: 'ACTIVE' | 'INACTIVE'
  managerId: string | null
  manager: {
    id: string
    status: 'ACTIVE' | 'INACTIVE'
  } | null
}

type DueFollowUpLead = {
  id: string
  referenceNo: string
  name: string
  followUpAt: Date | null
  followUpMessage: string | null
  followUpCreatedById: string | null
  followUpCreatedBy: LeadReminderCreator | null
  createdBy: LeadReminderCreator | null
}

type NotificationRow = {
  id: string
  taskId: string | null
  leadId: string | null
  type: string
  title: string
  message: string
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

type CreatedReminderNotification = {
  recipientId: string
  notification: NotificationRow
}

function buildReminderText(lead: DueFollowUpLead) {
  const reminderNote = lead.followUpMessage?.trim()

  if (reminderNote) {
    return `Follow-up reminder for ${lead.referenceNo} (${lead.name}) is due now. ${reminderNote}`
  }

  return `Follow-up reminder for ${lead.referenceNo} (${lead.name}) is due now.`
}

async function getActiveAdminIds() {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  })

  return admins.map((admin) => admin.id)
}

function addActiveUserRecipient(recipientIds: Set<string>, user: LeadReminderCreator | null) {
  if (!user || user.status !== 'ACTIVE') {
    return
  }

  recipientIds.add(user.id)

  if (user.role === 'MANAGER_USER' && user.manager?.status === 'ACTIVE') {
    recipientIds.add(user.manager.id)
  }
}

async function buildReminderRecipientIds(lead: DueFollowUpLead) {
  const recipientIds = new Set<string>(await getActiveAdminIds())

  addActiveUserRecipient(recipientIds, lead.followUpCreatedBy)
  addActiveUserRecipient(recipientIds, lead.createdBy)

  return Array.from(recipientIds)
}

export async function processDueLeadFollowUpReminders() {
  const now = new Date()

  const dueLeads = (await prisma.lead.findMany({
    where: {
      status: 'FOLLOW_UP',
      followUpAt: {
        lte: now,
      },
      followUpNotifiedAt: null,
    },
    select: {
      id: true,
      referenceNo: true,
      name: true,
      followUpAt: true,
      followUpMessage: true,
      followUpCreatedById: true,
      followUpCreatedBy: {
        select: {
          id: true,
          role: true,
          status: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          role: true,
          status: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  })) as unknown as DueFollowUpLead[]

  let processedCount = 0

  for (const lead of dueLeads) {
    const recipientIds = await buildReminderRecipientIds(lead)

    const notificationEvents = await prisma.$transaction(async (transaction) => {
      const claimedLead = await transaction.lead.updateMany({
        where: {
          id: lead.id,
          status: 'FOLLOW_UP',
          followUpAt: {
            lte: now,
          },
          followUpNotifiedAt: null,
        },
        data: {
          followUpNotifiedAt: now,
        },
      })

      if (claimedLead.count === 0) {
        return []
      }

      const createdNotifications: CreatedReminderNotification[] = []

      for (const recipientId of recipientIds) {
        const notification = await transaction.notification.create({
          data: {
            userId: recipientId,
            leadId: lead.id,
            type: 'FOLLOW_UP_REMINDER',
            title: `Follow-up due for ${lead.name}`,
            message: buildReminderText(lead),
            createdAt: now,
          },
          select: {
            id: true,
            taskId: true,
            leadId: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            readAt: true,
            createdAt: true,
          },
        })

        createdNotifications.push({
          recipientId,
          notification: notification as unknown as NotificationRow,
        })
      }

      return createdNotifications
    })

    for (const event of notificationEvents) {
      emitNotificationCreatedEvent(event.notification, event.recipientId)
    }

    if (notificationEvents.length > 0) {
      processedCount += 1
    }
  }

  return {
    processedCount,
    dueCount: dueLeads.length,
    checkedAt: now,
  }
}

let reminderScheduler: ReturnType<typeof setInterval> | null = null
let reminderSchedulerRunning = false

async function runReminderSchedulerTick() {
  if (reminderSchedulerRunning) {
    return
  }

  reminderSchedulerRunning = true

  try {
    const result = await processDueLeadFollowUpReminders()

    if (result.processedCount > 0) {
      logger.info('Processed follow-up reminders', result)
    }
  } catch (error) {
    logger.error('Failed to process follow-up reminders', error)
  } finally {
    reminderSchedulerRunning = false
  }
}

export function initializeLeadFollowUpReminderScheduler() {
  if (reminderScheduler) {
    return reminderScheduler
  }

  void runReminderSchedulerTick()

  reminderScheduler = setInterval(() => {
    void runReminderSchedulerTick()
  }, 60_000)

  return reminderScheduler
}
