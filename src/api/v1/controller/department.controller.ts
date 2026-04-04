import type { Request, Response } from 'express'

import { HTTP_STATUS, errorResponse, successResponse } from '../../../constant/index.js'
import {
  createDepartmentService,
  deleteDepartmentService,
  getDepartmentService,
  listDepartmentsService,
  updateDepartmentService,
  updateDepartmentStatusService,
} from '../services/department.service.js'

function getDepartmentIdParam(req: Request) {
  const departmentId = req.params.departmentId

  if (typeof departmentId !== 'string') {
    return undefined
  }

  return departmentId.trim()
}

export async function listDepartmentsController(req: Request, res: Response) {
  const departments = await listDepartmentsService(req.user?.role)

  return res.status(HTTP_STATUS.OK).json(successResponse('Departments fetched', departments))
}

export async function getDepartmentController(req: Request, res: Response) {
  const departmentId = getDepartmentIdParam(req)

  if (!departmentId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Department id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const department = await getDepartmentService(departmentId, req.user?.role)

  if (!department) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Department not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Department fetched', department))
}

export async function createDepartmentController(req: Request, res: Response) {
  const department = await createDepartmentService(req.body)

  return res.status(HTTP_STATUS.CREATED).json(successResponse('Department created', department))
}

export async function updateDepartmentController(req: Request, res: Response) {
  const departmentId = getDepartmentIdParam(req)

  if (!departmentId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Department id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const department = await updateDepartmentService(departmentId, req.body)

  if (!department) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Department not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Department updated', department))
}

export async function updateDepartmentStatusController(req: Request, res: Response) {
  const departmentId = getDepartmentIdParam(req)

  if (!departmentId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Department id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const { isActive } = req.body as { isActive: boolean }
  const department = await updateDepartmentStatusService(departmentId, isActive)

  if (!department) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Department not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Department status updated', department))
}

export async function deleteDepartmentController(req: Request, res: Response) {
  const departmentId = getDepartmentIdParam(req)

  if (!departmentId) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(errorResponse('Department id is required', HTTP_STATUS.BAD_REQUEST))
  }

  const deleted = await deleteDepartmentService(departmentId)

  if (!deleted) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(errorResponse('Department not found', HTTP_STATUS.NOT_FOUND))
  }

  return res.status(HTTP_STATUS.OK).json(successResponse('Department deleted'))
}
