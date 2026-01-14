import { createServerFn } from "@tanstack/react-start"
import type {
  ChangelogEntry,
  ChangelogEntryWithUser,
  PaginatedResult,
  UndoResult,
} from "@/src/app/types"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { ChangelogRepository } from "@/src/repositories/ChangelogRepository"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

export const fetchChangelogPaginated = createServerFn()
  .middleware([authGuardMiddleware])
  .inputValidator((data: { page: number; pageSize?: number }) => data)
  .handler(
    async ({ data }): Promise<PaginatedResult<ChangelogEntryWithUser>> => {
      return new ChangelogRepository().findPaginated(
        data.page,
        data.pageSize ?? 50
      )
    }
  )

export const fetchChangelogEntry = createServerFn()
  .middleware([authGuardMiddleware])
  .inputValidator((changelogId: number) => changelogId)
  .handler(async ({ data: changelogId }): Promise<ChangelogEntry | null> => {
    return (await new ChangelogRepository().findById(changelogId)) ?? null
  })

export const checkUndoConflict = createServerFn()
  .middleware([authGuardMiddleware])
  .inputValidator((changelogId: number) => changelogId)
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
        entry.changedFields || []
      )

      if (conflict) {
        return {
          canUndo: false,
          conflictId: conflict.id,
          conflictMessage: `Eine neuere Änderung existiert (ID: ${conflict.id})`,
        }
      }

      return { canUndo: true }
    }
  )

export const undoChange = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator((changelogId: number) => changelogId)
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
      entry.changedFields || []
    )

    if (conflict) {
      return {
        success: false,
        error: "Rückgängig nicht möglich: Es gibt neuere Änderungen",
        conflictId: conflict.id,
      }
    }

    // Perform the undo based on entity type
    if (entry.entityType === "item") {
      return undoItemChange(entry, context.userId, changelogRepo)
    } else if (entry.entityType === "location") {
      return undoLocationChange(entry, context.userId, changelogRepo)
    }

    return { success: false, error: "Unbekannter Entity-Typ" }
  })

async function undoItemChange(
  entry: ChangelogEntry,
  userId: string | null,
  changelogRepo: ChangelogRepository
): Promise<UndoResult> {
  const itemRepo = new ItemRepository()

  switch (entry.changeType) {
    case "create": {
      // Undo create = delete the item
      const itemToDelete = await itemRepo.findById(entry.entityId)
      if (!itemToDelete) {
        return { success: false, error: "Item existiert nicht mehr" }
      }
      await itemRepo.delete(entry.entityId)
      await changelogRepo.create({
        entityType: "item",
        entityId: entry.entityId,
        changeType: "delete",
        userId,
        beforeValues: itemToDelete as unknown as Record<string, unknown>,
        afterValues: null,
        changedFields: Object.keys(itemToDelete),
      })
      return { success: true, action: "deleted" }
    }

    case "update": {
      // Undo update = restore beforeValues
      const currentItem = await itemRepo.findById(entry.entityId)
      if (!currentItem) {
        return { success: false, error: "Item existiert nicht mehr" }
      }

      const restoredData = entry.beforeValues as Record<string, unknown>
      // Only restore the fields that were changed
      const updateData: Record<string, unknown> = {}
      for (const field of entry.changedFields || []) {
        if (field in restoredData) {
          updateData[field] = restoredData[field]
        }
      }
      updateData.id = entry.entityId

      const [updatedItem] = (await itemRepo.upsert(updateData)) || []

      await changelogRepo.create({
        entityType: "item",
        entityId: entry.entityId,
        changeType: "update",
        userId,
        beforeValues: currentItem as unknown as Record<string, unknown>,
        afterValues: updatedItem as unknown as Record<string, unknown>,
        changedFields: entry.changedFields || [],
      })
      return { success: true, action: "restored" }
    }

    case "delete": {
      // Undo delete = recreate from beforeValues with original ID
      const itemData = entry.beforeValues as Record<string, unknown>
      if (!itemData) {
        return {
          success: false,
          error: "Keine Daten zum Wiederherstellen vorhanden",
        }
      }

      // Remove readonly/generated fields that can't be inserted
      const insertData = { ...itemData }
      delete insertData.searchVector
      delete insertData.searchableText
      delete insertData.updatedAt
      // Convert date strings back to Date objects
      if (insertData.createdAt && typeof insertData.createdAt === "string") {
        insertData.createdAt = new Date(insertData.createdAt)
      }

      // Use restore method to INSERT with original ID
      const restoredItem = await itemRepo.restore(
        insertData as Parameters<typeof itemRepo.restore>[0]
      )

      if (!restoredItem) {
        return { success: false, error: "Fehler beim Wiederherstellen" }
      }

      await changelogRepo.create({
        entityType: "item",
        entityId: restoredItem.id,
        changeType: "create",
        userId,
        beforeValues: null,
        afterValues: restoredItem as unknown as Record<string, unknown>,
        changedFields: Object.keys(insertData),
      })
      return { success: true, action: "restored", newId: restoredItem.id }
    }

    default:
      return { success: false, error: "Unbekannter Änderungstyp" }
  }
}

async function undoLocationChange(
  entry: ChangelogEntry,
  userId: string | null,
  changelogRepo: ChangelogRepository
): Promise<UndoResult> {
  const locationRepo = new LocationRepository()

  switch (entry.changeType) {
    case "create": {
      // Undo create = delete the location
      const locationToDelete = await locationRepo.findById(entry.entityId)
      if (!locationToDelete) {
        return { success: false, error: "Location existiert nicht mehr" }
      }
      await locationRepo.delete(entry.entityId)
      await changelogRepo.create({
        entityType: "location",
        entityId: entry.entityId,
        changeType: "delete",
        userId,
        beforeValues: locationToDelete as unknown as Record<string, unknown>,
        afterValues: null,
        changedFields: Object.keys(locationToDelete),
      })
      return { success: true, action: "deleted" }
    }

    case "update": {
      // Undo update = restore beforeValues
      const currentLocation = await locationRepo.findById(entry.entityId)
      if (!currentLocation) {
        return { success: false, error: "Location existiert nicht mehr" }
      }

      const restoredData = entry.beforeValues as Record<string, unknown>
      // Only restore the fields that were changed
      const updateData: Record<string, unknown> = {}
      for (const field of entry.changedFields || []) {
        if (field in restoredData) {
          updateData[field] = restoredData[field]
        }
      }

      const updatedLocation = await locationRepo.update(
        entry.entityId,
        updateData
      )

      await changelogRepo.create({
        entityType: "location",
        entityId: entry.entityId,
        changeType: "update",
        userId,
        beforeValues: currentLocation as unknown as Record<string, unknown>,
        afterValues: updatedLocation as unknown as Record<string, unknown>,
        changedFields: entry.changedFields || [],
      })
      return { success: true, action: "restored" }
    }

    case "delete": {
      // Undo delete = recreate from beforeValues with original ID
      const locationData = entry.beforeValues as Record<string, unknown>
      if (!locationData) {
        return {
          success: false,
          error: "Keine Daten zum Wiederherstellen vorhanden",
        }
      }

      // Use restore method to INSERT with original ID
      const restoredLocation = await locationRepo.restore(
        locationData as Parameters<typeof locationRepo.restore>[0]
      )

      if (!restoredLocation) {
        return { success: false, error: "Fehler beim Wiederherstellen" }
      }

      await changelogRepo.create({
        entityType: "location",
        entityId: restoredLocation.id,
        changeType: "create",
        userId,
        beforeValues: null,
        afterValues: restoredLocation as unknown as Record<string, unknown>,
        changedFields: Object.keys(locationData),
      })
      return { success: true, action: "restored", newId: restoredLocation.id }
    }

    default:
      return { success: false, error: "Unbekannter Änderungstyp" }
  }
}
