// TEMPORARY: server functions for the one-time category and tag migration.

import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import {
  CategoryTable,
  ChangelogTable,
  DataMigrationTable,
  ItemTable,
} from "@/src/drizzle/schema"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { MIGRATION_ID, type MigrationItem, planMigration } from "./plan"

type Executor = Pick<typeof db, "select">

async function loadItems(executor: Executor): Promise<MigrationItem[]> {
  return executor
    .select({
      id: ItemTable.id,
      name: ItemTable.name,
      category: ItemTable.category,
      tags: ItemTable.tags,
      manufacturer: ItemTable.manufacturer,
    })
    .from(ItemTable)
    .orderBy(ItemTable.id)
}

async function isApplied(executor: Executor): Promise<boolean> {
  const rows = await executor
    .select()
    .from(DataMigrationTable)
    .where(eq(DataMigrationTable.id, MIGRATION_ID))
  return rows.length > 0
}

export const previewMigration = createServerFn()
  .middleware([authGuardMiddleware])
  .handler(async () => {
    const [applied, items] = await Promise.all([isApplied(db), loadItems(db)])
    return { applied, itemCount: items.length, plan: planMigration(items) }
  })

export const runMigration = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  // Number of changes the user saw in the preview
  .validator((expectedChanges: number) => expectedChanges)
  .handler(async ({ data: expectedChanges }) => {
    return db.transaction(async (tx) => {
      if (await isApplied(tx)) {
        throw new Error("Die Migration wurde bereits ausgeführt.")
      }

      const plan = planMigration(await loadItems(tx))
      if (plan.changes.length !== expectedChanges) {
        throw new Error(
          "Die Daten haben sich seit der Vorschau geändert. Bitte die Vorschau neu laden.",
        )
      }

      await tx
        .insert(CategoryTable)
        .values(plan.categories.map((name) => ({ name })))
        .onConflictDoNothing()

      for (const change of plan.changes) {
        await tx
          .update(ItemTable)
          .set({
            category: change.after.category,
            tags: change.after.tags,
            updatedAt: new Date(),
          })
          .where(eq(ItemTable.id, change.id))

        // Logged per item, so single items can be undone in /changelog
        await tx.insert(ChangelogTable).values({
          entityType: "item",
          entityId: change.id,
          changeType: "update",
          userId: "migration",
          beforeValues: change.before,
          afterValues: change.after,
          changedFields: change.changedFields,
        })
      }

      // Primary key makes a concurrent second run fail and roll back
      await tx.insert(DataMigrationTable).values({ id: MIGRATION_ID })

      return { changed: plan.changes.length }
    })
  })
