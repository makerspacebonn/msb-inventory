import { type Database, db } from "../db"
import {
  ItemViewTable,
  MaintenanceTaskTable,
  SearchCountTable,
} from "../drizzle/schema"

/**
 * One-off changes to data, run once at startup after the schema is up to
 * date (see run.sh). Each runs in a transaction together with the record
 * that it ran, so it runs exactly once. New tasks go at the end; a task's
 * name must never change
 */
export const MAINTENANCE_TASKS: {
  name: string
  run: (tx: Database) => Promise<unknown>
}[] = [
  {
    // Searches were counted whenever a results page loaded, so crawlers
    // following tag links inflated them; they can't be told apart
    name: "stats-001-reset-search-counts",
    run: (tx) => tx.delete(SearchCountTable),
  },
  {
    // Views were counted whenever an item page loaded, crawlers included
    name: "stats-001-reset-item-views",
    run: (tx) => tx.delete(ItemViewTable),
  },
]

/** Runs the tasks that haven't run yet; returns their names */
export async function runMaintenance(
  tasks = MAINTENANCE_TASKS,
  database: Database = db,
): Promise<string[]> {
  const ran: string[] = []
  for (const task of tasks) {
    await database.transaction(async (tx) => {
      const [claimed] = await tx
        .insert(MaintenanceTaskTable)
        .values({ name: task.name })
        .onConflictDoNothing()
        .returning()
      if (!claimed) return
      await task.run(tx)
      ran.push(task.name)
    })
  }
  return ran
}
