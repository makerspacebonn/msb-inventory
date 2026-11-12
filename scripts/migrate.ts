/**
 * Brings the database schema up to date with the migrations in
 * src/drizzle/migrations. Called by run.sh at every start, before the
 * maintenance tasks.
 *
 * Databases created before 0.3.1 were kept in shape with `drizzle-kit push`
 * and have no record of the baseline migration. For those it runs `push`
 * one last time, so the schema matches the baseline exactly, and records the
 * baseline as applied. From then on only migrations change the schema
 */
import { spawnSync } from "node:child_process"
import { sql } from "drizzle-orm"
import { readMigrationFiles } from "drizzle-orm/migrator"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"

const MIGRATIONS = {
  migrationsFolder: "./src/drizzle/migrations",
  migrationsTable: "migrations",
  migrationsSchema: "makerspace_inventory",
} as const

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Migrate: DATABASE_URL is not set")
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool)

async function adoptPushedDatabase(): Promise<void> {
  const [baseline] = readMigrationFiles(MIGRATIONS)
  if (!baseline) throw new Error("No baseline migration found")

  const { rows: existing } = await db.execute<{ items: string | null }>(
    sql`select to_regclass('public.items')::text as items`,
  )
  if (!existing[0]?.items) return // empty database: migrate builds it

  await db.execute(sql`create schema if not exists makerspace_inventory`)
  await db.execute(sql`
    create table if not exists makerspace_inventory.migrations (
      id serial primary key, hash text not null, created_at bigint
    )`)
  const { rows: recorded } = await db.execute(
    sql`select 1 from makerspace_inventory.migrations where hash = ${baseline.hash}`,
  )
  if (recorded.length > 0) return // already adopted

  console.log("Migrate: database was built with push, adopting the baseline")
  const push = spawnSync("bunx", ["drizzle-kit", "push", "--force"], {
    stdio: "inherit",
  })
  if (push.status !== 0) throw new Error("drizzle-kit push failed")

  await db.execute(sql`
    insert into makerspace_inventory.migrations (hash, created_at)
    values (${baseline.hash}, ${baseline.folderMillis})`)
}

try {
  await adoptPushedDatabase()
  await migrate(db, MIGRATIONS)
  console.log("Migrate: schema is up to date")
} catch (error) {
  console.error("Migrate: failed", error)
  process.exitCode = 1
} finally {
  await pool.end()
}
