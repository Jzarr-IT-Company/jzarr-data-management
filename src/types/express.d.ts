import type { UserRole } from './user-role.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: UserRole
        email: string
        name: string
        allowedScreens?: string[]
      }
    }
  }
}

export {}
