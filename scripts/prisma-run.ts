import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const [mode = 'development', ...prismaArgs] = process.argv.slice(2)
const envPath = resolve(process.cwd(), `.env.${mode}`)

if (!existsSync(envPath)) {
  console.error(`Missing env file: ${envPath}`)
  process.exit(1)
}

const loaded = dotenv.config({ path: envPath, override: true })

if (loaded.error) {
  console.error(loaded.error.message)
  process.exit(1)
}

const prismaBin = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
const result = spawnSync(process.execPath, [prismaBin, ...prismaArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...loaded.parsed,
    NODE_ENV: mode,
  },
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
