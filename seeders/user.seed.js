import bcrypt from 'bcryptjs'
import { UserRole, UserStatus } from '@prisma/client'

export async function seedUsers(prisma) {
  const departments = [
    { name: 'Jzarr Filer', code: 'FILER', accent: 'blue' },
    { name: 'Jzarr BR', code: 'BR', accent: 'amber' },
    { name: 'Jzarr Education', code: 'EDU', accent: 'green' },
  ]

  for (const department of departments) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: department,
      create: department,
    })
  }

  const passwordHash = await bcrypt.hash('Admin@123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@jzarr.pk' },
    update: {
      name: 'Waseem Jakhrani',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      designation: 'Admin',
    },
    create: {
      name: 'Waseem Jakhrani',
      email: 'admin@jzarr.pk',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      designation: 'Admin',
    },
  })

  const managerPasswordHash = await bcrypt.hash('Manager@123', 10)
  const managerSeeds = [
    {
      name: 'Muhammad Usama',
      email: 'usama@jzarr.pk',
      phone: '0300 1234567',
      designation: 'Department Manager',
      departmentCodes: ['BR'],
    },
    {
      name: 'Areeba Khan',
      email: 'areeba@jzarr.pk',
      phone: '0301 7654321',
      designation: 'Department Manager',
      departmentCodes: ['EDU'],
    },
    {
      name: 'Hassan Raza',
      email: 'hassan@jzarr.pk',
      phone: '0302 1112233',
      designation: 'Department Manager',
      departmentCodes: ['FILER'],
    },
  ]

  for (const managerSeed of managerSeeds) {
    const departments = await prisma.department.findMany({
      where: {
        code: {
          in: managerSeed.departmentCodes,
        },
      },
      select: {
        id: true,
      },
    })

    await prisma.user.upsert({
      where: { email: managerSeed.email },
      update: {
        name: managerSeed.name,
        passwordHash: managerPasswordHash,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        phone: managerSeed.phone,
        designation: managerSeed.designation,
        managedDepartments: {
          set: departments.map((department) => ({ id: department.id })),
        },
      },
      create: {
        name: managerSeed.name,
        email: managerSeed.email,
        passwordHash: managerPasswordHash,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        phone: managerSeed.phone,
        designation: managerSeed.designation,
        managedDepartments: {
          connect: departments.map((department) => ({ id: department.id })),
        },
      },
    })
  }
}
