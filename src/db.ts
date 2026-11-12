import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres"
import type { PgDatabase } from "drizzle-orm/pg-core"
import * as schema from "./drizzle/schema"
export const db = drizzle(process.env.DATABASE_URL as string, {
  schema,
  // Logged queries include their values, e.g. names, email addresses and
  // session tokens, so only when asked for while debugging (PRIV-001)
  logger: process.env.DB_QUERY_LOG === "1",
})

/** The database or an open transaction: repositories work with either */
export type Database = PgDatabase<NodePgQueryResultHKT, typeof schema>
