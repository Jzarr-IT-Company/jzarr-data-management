import { env } from './loadEnv.js'

export const databaseConfig = {
  url: env.DATABASE_URL,
}
