import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

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

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
})

export const env = envSchema.parse(process.env)
