import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createManagerService,
  createManagerUserService,
  createSubAdminService,
  deleteManagerService,
  deleteManagerUserService,
  deleteSubAdminService,
  getManagerService,
  getManagerUserService,
  getSubAdminService,
  listManagersService,
  listManagerUsersService,
  listSubAdminsService,
  resetManagerPasswordService,
  resetManagerUserPasswordService,
  resetSubAdminPasswordService,
  updateManagerService,
  updateManagerUserService,
  updateManagerUserStatusService,
  updateManagerStatusService,
  updateSubAdminService,
  updateSubAdminStatusService,
} from '../services/user.service.js'

function getManagerIdParam(req: Request) {
  const managerId = req.params.managerId

  if (typeof managerId !== 'string') {
    return undefined
  }

  return managerId.trim()
}

function getManagerUserIdParam(req: Request) {
  const managerUserId = req.params.managerUserId

  if (typeof managerUserId !== 'string') {
    return undefined
  }

  return managerUserId.trim()
}

export async function listManagersController(_req: Request, res: Response) {
  const managers = await listManagersService()

  return res.status(HTTP_STATUS.OK).json(successResponse('Managers fetched', managers))
}

export async function createManagerController(req: Request, res: Response) {
  const result = await createManagerService(req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Manager created', result))
}

export async function getManagerController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const manager = await getManagerService(managerId)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager fetched', manager))
}

export async function updateManagerController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const manager = await updateManagerService(managerId, req.body)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager updated', manager))
}

export async function updateManagerStatusController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { status } = req.body as { status: 'ACTIVE' | 'INACTIVE' }
  const manager = await updateManagerStatusService(managerId, status)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager status updated', manager))
}

export async function resetManagerPasswordController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { password } = req.body as { password: string }
  const manager = await resetManagerPasswordService(managerId, password)

  if (!manager) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(successResponse('Manager password reset successfully', manager))
}

export async function deleteManagerController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteManagerService(managerId)

  if (!deleted) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager deleted'))
}

export async function listManagerUsersController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (req.user?.role === 'MANAGER' && req.user.id !== managerId) {
    return res
      .status(HTTP_STATUS.FORBIDDEN)
      .json(errorResponse('Forbidden', HTTP_STATUS.FORBIDDEN))
  }

  const managerUsers = await listManagerUsersService(managerId)

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager users fetched', managerUsers))
}

export async function createManagerUserController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const result = await createManagerUserService(managerId, req.body)

  if (!result) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Manager user created', result))
}

export async function getManagerUserController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)
  const managerUserId = getManagerUserIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (!managerUserId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager user id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const managerUser = await getManagerUserService(managerId, managerUserId)

  if (!managerUser) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager user not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager user fetched', managerUser))
}

export async function updateManagerUserController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)
  const managerUserId = getManagerUserIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (!managerUserId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager user id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const managerUser = await updateManagerUserService(managerId, managerUserId, req.body)

  if (!managerUser) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager user not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager user updated', managerUser))
}

export async function updateManagerUserStatusController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)
  const managerUserId = getManagerUserIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (!managerUserId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager user id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { status } = req.body as { status: 'ACTIVE' | 'INACTIVE' }
  const managerUser = await updateManagerUserStatusService(managerId, managerUserId, status)

  if (!managerUser) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager user not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager user status updated', managerUser))
}

export async function resetManagerUserPasswordController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)
  const managerUserId = getManagerUserIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (!managerUserId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager user id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { password } = req.body as { password: string }
  const managerUser = await resetManagerUserPasswordService(managerId, managerUserId, password)

  if (!managerUser) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager user not found', HTTP_STATUS.NOT_FOUND))
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(successResponse('Manager user password reset successfully', managerUser))
}

export async function deleteManagerUserController(req: Request, res: Response) {
  const managerId = getManagerIdParam(req)
  const managerUserId = getManagerUserIdParam(req)

  if (!managerId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager id is required', HTTP_STATUS.BAD_REQUEST))
  }

  if (!managerUserId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Manager user id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteManagerUserService(managerId, managerUserId)

  if (!deleted) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Manager user not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Manager user deleted'))
}

export async function listSubAdminsController(_req: Request, res: Response) {
  const subAdmins = await listSubAdminsService()

  return res.status(HTTP_STATUS.OK).json(successResponse('Sub admins fetched', subAdmins))
}

export async function createSubAdminController(req: Request, res: Response) {
  const result = await createSubAdminService(req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Sub admin created', result))
}

export async function getSubAdminController(req: Request, res: Response) {
  const subAdminId = getManagerIdParam(req)

  if (!subAdminId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Sub admin id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const subAdmin = await getSubAdminService(subAdminId)

  if (!subAdmin) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Sub admin not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Sub admin fetched', subAdmin))
}

export async function updateSubAdminController(req: Request, res: Response) {
  const subAdminId = getManagerIdParam(req)

  if (!subAdminId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Sub admin id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const subAdmin = await updateSubAdminService(subAdminId, req.body)

  if (!subAdmin) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Sub admin not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Sub admin updated', subAdmin))
}

export async function updateSubAdminStatusController(req: Request, res: Response) {
  const subAdminId = getManagerIdParam(req)

  if (!subAdminId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Sub admin id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { status } = req.body as { status: 'ACTIVE' | 'INACTIVE' }
  const subAdmin = await updateSubAdminStatusService(subAdminId, status)

  if (!subAdmin) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Sub admin not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Sub admin status updated', subAdmin))
}

export async function resetSubAdminPasswordController(req: Request, res: Response) {
  const subAdminId = getManagerIdParam(req)

  if (!subAdminId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Sub admin id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { password } = req.body as { password: string }
  const subAdmin = await resetSubAdminPasswordService(subAdminId, password)

  if (!subAdmin) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Sub admin not found', HTTP_STATUS.NOT_FOUND))
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(successResponse('Sub admin password reset successfully', subAdmin))
}

export async function deleteSubAdminController(req: Request, res: Response) {
  const subAdminId = getManagerIdParam(req)

  if (!subAdminId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Sub admin id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteSubAdminService(subAdminId)

  if (!deleted) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Sub admin not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Sub admin deleted'))
}
