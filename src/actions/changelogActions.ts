import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import type {
  ChangelogEntry,
  ChangelogEntryWithUser,
  EntityType,
  PaginatedResult,
  UndoResult,
} from "@/src/app/types"
import { type Database, db } from "@/src/db"
import { type UndoStore, undoEntries } from "@/src/lib/undoEntityChange"
import {
  adminGuardMiddleware,
  authGuardMiddleware,
} from "@/src/middleware/authMiddleware"
import {
  ChangelogRepository,
  recordChange,
} from "@/src/repositories/ChangelogRepository"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

export const fetchChangelogPaginated = createServerFn()
  .middleware([authGuardMiddleware])
  .validator((data: { page: number; pageSize?: number }) => data)
  .handler(
    async ({ data }): Promise<PaginatedResult<ChangelogEntryWithUser>> => {
      return new ChangelogRepository().findPaginated(
        data.page,
        data.pageSize ?? 50,
      )
    },
  )

export const fetchChangelogEntry = createServerFn()
  .middleware([authGuardMiddleware])
  .validator((changelogId: number) => changelogId)
  .handler(async ({ data: changelogId }): Promise<ChangelogEntry | null> => {
    return (await new ChangelogRepository().findById(changelogId)) ?? null
  })

/**
 * What undoing an entry would touch: the entry and everything undone with
 * it. A newer change to any of them blocks the whole undo
 */
async function loadUndoTarget(changelogId: number) {
  const changelog = new ChangelogRepository()
  const entry = await changelog.findById(changelogId)
  if (!entry) return null

  const entries = await changelog.findWithGroup(entry)
  for (const member of entries) {
    const conflict = await changelog.findConflictingChanges(
      member.id,
      member.entityType,
      member.entityId,
      member.changedFields || [],
    )
    if (conflict) return { entries, conflict }
  }
  return { entries, conflict: null }
}

export const checkUndoConflict = createServerFn()
  .middleware([adminGuardMiddleware])
  .validator((changelogId: number) => changelogId)
  .handler(
    async ({
      data: changelogId,
    }): Promise<{
      canUndo: boolean
      error?: string
      conflictId?: number
      conflictMessage?: string
    }> => {
      const target = await loadUndoTarget(changelogId)
      if (!target) {
        return { canUndo: false, error: "Changelog-Eintrag nicht gefunden" }
      }
      if (target.conflict) {
        return {
          canUndo: false,
          conflictId: target.conflict.id,
          conflictMessage: `Eine neuere Änderung existiert (ID: ${target.conflict.id})`,
        }
      }
      return { canUndo: true }
    },
  )

/** Leaves the transaction, so everything undone so far is rolled back */
class UndoFailed extends Error {
  constructor(readonly result: UndoResult) {
    super(result.error)
  }
}

export const undoChange = createServerFn({ method: "POST" })
  .middleware([adminGuardMiddleware])
  .validator((changelogId: number) => changelogId)
  .handler(async ({ data: changelogId, context }): Promise<UndoResult> => {
    const target = await loadUndoTarget(changelogId)
    if (!target) {
      return { success: false, error: "Changelog-Eintrag nicht gefunden" }
    }
    if (target.conflict) {
      return {
        success: false,
        error: "Rückgängig nicht möglich: Es gibt neuere Änderungen",
        conflictId: target.conflict.id,
      }
    }

    // The undo is one action too, so it can be undone as a whole again
    const groupId = target.entries.length > 1 ? uuidv7() : null

    try {
      return await db.transaction(async (tx) => {
        const result = await undoEntries(
          target.entries,
          (entityType) => undoStores[entityType]?.(tx),
          {
            userId: context.userId,
            record: (change) => recordChange({ ...change, groupId }, tx),
          },
        )
        if (!result.success) throw new UndoFailed(result)
        return result
      })
    } catch (error) {
      if (error instanceof UndoFailed) return error.result
      throw error
    }
  })

const undoStores: Record<
  EntityType,
  (database: Database) => UndoStore<{ id: number }>
> = {
  item: (database) => {
    const items = new ItemRepository(database)
    return {
      entityType: "item",
      label: "Item",
      findById: (id) => items.findById(id),
      delete: (id) => items.delete(id),
      update: async (id, fields) =>
        (await items.upsert({ ...fields, id }))?.[0],
      restore: (data) =>
        items.restore(data as Parameters<typeof items.restore>[0]),
      // Search fields are generated, updatedAt is set on saving, and the
      // snapshot holds createdAt as a string
      prepareRestore: ({ searchVector, searchableText, updatedAt, ...rest }) =>
        typeof rest.createdAt === "string"
          ? { ...rest, createdAt: new Date(rest.createdAt) }
          : rest,
    }
  },
  location: (database) => {
    const locations = new LocationRepository(database)
    return {
      entityType: "location",
      label: "Location",
      findById: (id) => locations.findById(id),
      delete: (id) => locations.delete(id),
      update: (id, fields) => locations.update(id, fields),
      restore: (data) =>
        locations.restore(data as Parameters<typeof locations.restore>[0]),
    }
  },
}
