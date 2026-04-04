import { env } from './env.js'

export function parseCorsOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const corsConfig = {
  allowedOrigins: parseCorsOrigins(env.CORS_ORIGINS),
}
