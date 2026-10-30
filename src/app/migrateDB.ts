import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import * as schema from "../drizzle/schema"

export async function migrateDB() {
  console.log("migrating")
  const db = drizzle(process.env.DATABASE_URL as string, { schema })
  await migrate(db, {
    migrationsFolder: __dirname + "/../drizzle/migrations/",
    migrationsTable: "migrations",
    migrationsSchema: "makerspace_inventory",
  })
  console.log("migration done")
}
