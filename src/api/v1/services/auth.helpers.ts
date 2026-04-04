import { env } from '../../../config/loadEnv.js'
import { prisma } from '../../../lib/prisma.js'
import { generateRefreshToken, hashToken, signAccessToken } from '../../../utils/auth.js'

const REFRESH_TOKEN_PATTERN = /^(\d+)([mhd])$/

type PrismaUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>
type PrismaRefreshToken = Awaited<ReturnType<typeof prisma.refreshToken.findUnique>>
type PrismaRefreshTokenWithUser = NonNullable<
  Awaited<ReturnType<typeof prisma.refreshToken.findUnique>>
> & { user: PrismaUser }

type DepartmentSummary = {
  id: string
  name: string
  code: string
  accent: string
  isActive: boolean
}

type PrismaUserWithDepartments = PrismaUser & {
  managedDepartments?: DepartmentSummary[]
}

export type SafeUser = Pick<
  PrismaUser,
  'id' | 'name' | 'email' | 'role' | 'status' | 'designation'
> & {
  departments: DepartmentSummary[]
}

export function toSafeUser(user: PrismaUserWithDepartments): SafeUser {
  const { id, name, email, role, status, designation } = user

  return {
    id,
    name,
    email,
    role,
    status,
    designation,
    departments: user.managedDepartments || [],
  }
}

export function isActiveUser(user: PrismaUser) {
  return user.status === 'ACTIVE'
}

export function createAccessToken(user: PrismaUser) {
  return signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })
}

export function parseDurationToMs(duration: string) {
  const match = duration.trim().match(REFRESH_TOKEN_PATTERN)

  if (!match) {
    return 15 * 60 * 1000
  }

  const value = Number(match[1])
  const unit = match[2]

  switch (unit) {
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 15 * 60 * 1000
  }
}

export function createRefreshTokenRecordData(userId: string) {
  const refreshToken = generateRefreshToken()
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN))

  return {
    refreshToken,
    tokenHash,
    expiresAt,
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  }
}

export function isRefreshTokenActive(token: PrismaRefreshToken | PrismaRefreshTokenWithUser | null) {
  if (!token) {
    return false
  }

  return !token.revokedAt && token.expiresAt > new Date()
}

export function hashRefreshToken(refreshToken: string) {
  return hashToken(refreshToken)
}
