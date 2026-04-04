import { HTTP_STATUS } from './http.js'

export function successResponse(message: string, data?: unknown) {
  return {
    success: true,
    message,
    data,
  }
}

export function errorResponse(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
  return {
    success: false,
    message,
    statusCode,
  }
}
