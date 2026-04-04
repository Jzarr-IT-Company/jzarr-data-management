import { HTTP_STATUS } from '../constant/http.js'

export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}
