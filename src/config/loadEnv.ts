import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envMode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
const envPaths = [
  resolve(process.cwd(), `.env.${envMode}`),
  resolve(process.cwd(), '.env'),
]

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}
