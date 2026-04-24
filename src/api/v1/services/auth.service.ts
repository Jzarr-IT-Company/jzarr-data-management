import { prisma } from '../../../lib/prisma.js'
import { comparePassword, hashPassword } from '../../../utils/auth.js'
import {
  createAccessToken,
  createRefreshTokenRecordData,
  hashRefreshToken,
  isActiveUser,
  isRefreshTokenActive,
  toSafeUser,
} from './auth.helpers.js'

const AUTH_USER_INCLUDE = {
  managedDepartments: {
    select: {
      id: true,
      name: true,
      code: true,
      accent: true,
      isActive: true,
    },
  },
  manager: {
    select: {
      id: true,
      status: true,
      managedDepartments: {
        select: {
          id: true,
          name: true,
          code: true,
          accent: true,
          isActive: true,
        },
      },
    },
  },
} as const

function isAccessibleUserActive(user: {
  role: string
  manager?: {
    status: 'ACTIVE' | 'INACTIVE'
  } | null
}) {
  if (user.role === 'MANAGER_USER') {
    return user.manager?.status === 'ACTIVE'
  }

  return true
}

export async function loginService(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: AUTH_USER_INCLUDE,
  })

  if (!user || !isActiveUser(user)) {
    return null
  }

  if (!isAccessibleUserActive(user)) {
    return null
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash)

  if (!isPasswordValid) {
    return null
  }

  if (user.role === 'MANAGER_USER' && (!user.manager || user.manager.status !== 'ACTIVE')) {
    return null
  }

  const { refreshToken, data } = createRefreshTokenRecordData(user.id)

  await prisma.refreshToken.create({
    data,
  })

  return {
    accessToken: createAccessToken(user),
    refreshToken,
    user: toSafeUser(user),
  }
}

export async function getCurrentUserService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: AUTH_USER_INCLUDE,
  })

  if (!user || !isActiveUser(user)) {
    return null
  }

  if (!isAccessibleUserActive(user)) {
    return null
  }

  return toSafeUser(user)
}

export async function refreshSessionService(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken)
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: AUTH_USER_INCLUDE,
      },
    },
  })

  if (!storedToken || !isRefreshTokenActive(storedToken) || !isActiveUser(storedToken.user)) {
    return null
  }

  if (!isAccessibleUserActive(storedToken.user)) {
    return null
  }

  return {
    accessToken: createAccessToken(storedToken.user),
    user: toSafeUser(storedToken.user),
  }
}

export async function logoutService(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken)
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  })

  if (!isRefreshTokenActive(storedToken)) {
    return false
  }

  await prisma.refreshToken.update({
    where: { tokenHash },
    data: {
      revokedAt: new Date(),
    },
  })

  return true
}

export async function changeCurrentUserPasswordService(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: AUTH_USER_INCLUDE,
  })

  if (!user || !isActiveUser(user)) {
    return null
  }

  if (!isAccessibleUserActive(user)) {
    return null
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash)

  if (!isCurrentPasswordValid) {
    return 'INVALID_CURRENT_PASSWORD' as const
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ])

  return toSafeUser(user)
}
