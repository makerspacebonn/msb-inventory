/**
 * E2E Test API - Group changes
 *
 * Puts the newest changelog entry of the given items into one group, as if
 * they were one action. Optionally adds an older entry for an item that
 * doesn't exist, which makes undoing the group fail halfway.
 *
 * SECURITY: Only works with E2E_TEST_API=1, which only docker-compose.e2e.yml
 * sets. NODE_ENV can't guard this: the build fixes it to "production"
 */
import { createFileRoute } from "@tanstack/react-router"
import { and, desc, eq } from "drizzle-orm"
import { v7 as uuidv7 } from "uuid"
import { db } from "@/src/db"
import { ChangelogTable } from "@/src/drizzle/schema"

export const Route = createFileRoute("/api/e2e/group-changes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.E2E_TEST_API !== "1") {
          return new Response("Not available in production", { status: 403 })
        }

        const { itemIds, addMissingItem } = (await request.json()) as {
          itemIds: number[]
          addMissingItem?: boolean
        }
        const groupId = uuidv7()

        for (const itemId of itemIds) {
          const [newest] = await db
            .select({ id: ChangelogTable.id })
            .from(ChangelogTable)
            .where(
              and(
                eq(ChangelogTable.entityType, "item"),
                eq(ChangelogTable.entityId, itemId),
              ),
            )
            .orderBy(desc(ChangelogTable.id))
            .limit(1)
          await db
            .update(ChangelogTable)
            .set({ groupId })
            .where(eq(ChangelogTable.id, newest.id))
        }

        if (addMissingItem) {
          await db.insert(ChangelogTable).values({
            entityType: "item",
            entityId: 999_999_999,
            changeType: "update",
            changedAt: new Date("2000-01-01"),
            beforeValues: { name: "Gibt es nicht" },
            afterValues: { name: "Gibt es nicht" },
            changedFields: ["name"],
            groupId,
          })
        }

        return Response.json({ groupId })
      },
    },
  },
})
