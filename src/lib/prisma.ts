import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

type PrismaClientWithTaskModels = PrismaClient & {
  task: Prisma.TaskDelegate
  notification: Prisma.NotificationDelegate
}

const prismaClient = globalThis as unknown as {
  prisma?: PrismaClientWithTaskModels
}

export const prisma: PrismaClientWithTaskModels = prismaClient.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  prismaClient.prisma = prisma
}
