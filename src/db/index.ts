import { drizzle } from 'drizzle-orm/bun-sqlite'

import * as schema from './schema/index.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}
export const db = drizzle(databaseUrl, { schema })
