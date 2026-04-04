import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { seedUsers } from '../seeders/user.seed.js'

function resolveMode() {
  const explicitMode = process.argv.find((argument) =>
    argument === 'production' || argument === 'development',
  )

  if (explicitMode) {
    return explicitMode
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

const mode = resolveMode()
const envPath = resolve(process.cwd(), `.env.${mode}`)

if (existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
} else {
  dotenv.config({ override: true })
}

const prisma = new PrismaClient()

async function main() {
  console.log(`Seeding using ${mode} environment.`)
  await seedUsers(prisma)
  console.log('Seed completed successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
