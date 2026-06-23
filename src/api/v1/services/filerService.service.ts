import { HTTP_STATUS } from '../../../constant/index.js'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../utils/app-error.js'

const SERVICE_SELECT = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listFilerServicesService() {
  return prisma.filerService.findMany({
    orderBy: { name: 'asc' },
    select: SERVICE_SELECT,
  })
}

export async function createFilerServiceService(payload: { name: string }) {
  return prisma.filerService.create({
    data: {
      name: payload.name.trim(),
    },
    select: SERVICE_SELECT,
  })
}

export async function updateFilerServiceService(
  serviceId: string,
  payload: { name?: string; isActive?: boolean },
) {
  const existing = await prisma.filerService.findUnique({ where: { id: serviceId } })

  if (!existing) {
    throw new AppError('Service not found', HTTP_STATUS.NOT_FOUND)
  }

  return prisma.filerService.update({
    where: { id: serviceId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    },
    select: SERVICE_SELECT,
  })
}

export async function deleteFilerServiceService(serviceId: string) {
  const existing = await prisma.filerService.findUnique({ where: { id: serviceId } })

  if (!existing) {
    throw new AppError('Service not found', HTTP_STATUS.NOT_FOUND)
  }

  await prisma.filerService.delete({ where: { id: serviceId } })

  return true
}
