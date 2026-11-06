import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres"
import type { PgDatabase } from "drizzle-orm/pg-core"
import * as schema from "./drizzle/schema"
export const db = drizzle(process.env.DATABASE_URL as string, {
  schema,
  logger: true,
})

/** The database or an open transaction: repositories work with either */
export type Database = PgDatabase<NodePgQueryResultHKT, typeof schema>
