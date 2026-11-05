import { createServerFn } from "@tanstack/react-start"
import type {
  ChangelogEntry,
  ChangelogEntryWithUser,
  EntityType,
  PaginatedResult,
  UndoResult,
} from "@/src/app/types"
import { type UndoStore, undoEntityChange } from "@/src/lib/undoEntityChange"
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
      const changelogRepo = new ChangelogRepository()
      const entry = await changelogRepo.findById(changelogId)

      if (!entry) {
        return { canUndo: false, error: "Changelog-Eintrag nicht gefunden" }
      }

      const conflict = await changelogRepo.findConflictingChanges(
        changelogId,
        entry.entityType,
        entry.entityId,
        entry.changedFields || [],
      )

      if (conflict) {
        return {
          canUndo: false,
          conflictId: conflict.id,
          conflictMessage: `Eine neuere Änderung existiert (ID: ${conflict.id})`,
        }
      }

      return { canUndo: true }
    },
  )

export const undoChange = createServerFn({ method: "POST" })
  .middleware([adminGuardMiddleware])
  .validator((changelogId: number) => changelogId)
  .handler(async ({ data: changelogId, context }): Promise<UndoResult> => {
    const changelogRepo = new ChangelogRepository()
    const entry = await changelogRepo.findById(changelogId)

    if (!entry) {
      return { success: false, error: "Changelog-Eintrag nicht gefunden" }
    }

    // Check for conflicts first
    const conflict = await changelogRepo.findConflictingChanges(
      changelogId,
      entry.entityType,
      entry.entityId,
      entry.changedFields || [],
    )

    if (conflict) {
      return {
        success: false,
        error: "Rückgängig nicht möglich: Es gibt neuere Änderungen",
        conflictId: conflict.id,
      }
    }

    const store = undoStores[entry.entityType]?.()
    if (!store) {
      return { success: false, error: "Unbekannter Entity-Typ" }
    }
    return undoEntityChange(entry, store, {
      userId: context.userId,
      record: recordChange,
    })
  })

const undoStores: Record<EntityType, () => UndoStore<{ id: number }>> = {
  item: () => {
    const items = new ItemRepository()
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
  location: () => {
    const locations = new LocationRepository()
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
