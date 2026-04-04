import { env } from './loadEnv.js'

export function parseCorsOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const corsConfig = {
  allowedOrigins: parseCorsOrigins(env.CORS_ORIGINS),
}
