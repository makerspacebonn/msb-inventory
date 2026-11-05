import type {
  ChangelogEntry,
  ChangeType,
  EntityType,
  UndoResult,
} from "@/src/app/types"

type Fields = Record<string, unknown>

/**
 * What undo needs from the storage of one kind of entity. The kinds differ
 * only in how they save an update and in which saved values can be written
 * back when a deleted entity is restored
 */
export type UndoStore<T extends { id: number }> = {
  entityType: EntityType
  /** Name of the entity kind in messages, e.g. "Item" */
  label: string
  findById(id: number): Promise<T | null | undefined>
  delete(id: number): Promise<unknown>
  update(id: number, fields: Fields): Promise<T | null | undefined>
  /** Inserts a deleted entity again, keeping its id */
  restore(data: Fields): Promise<T | null | undefined>
  /** Turns the saved snapshot into values the store can insert */
  prepareRestore?(saved: Fields): Fields
}

export type RecordedChange = {
  entityType: EntityType
  entityId: number
  changeType: ChangeType
  userId: string | null
  before: object | null
  after: object | null
  changedFields: string[]
}

export type UndoContext = {
  userId: string | null
  /** Logs the undo itself as a new change */
  record: (change: RecordedChange) => Promise<unknown>
}

/**
 * Reverts one changelog entry: a creation is undone by deleting, an update
 * by writing back the changed fields, a deletion by restoring the entity
 * with its old id. The undo is logged as a change of its own, so it can be
 * undone too. Checking for newer conflicting changes is up to the caller
 */
export async function undoEntityChange<T extends { id: number }>(
  entry: ChangelogEntry,
  store: UndoStore<T>,
  { userId, record }: UndoContext,
): Promise<UndoResult> {
  const log = (change: Omit<RecordedChange, "entityType" | "userId">) =>
    record({ ...change, entityType: store.entityType, userId })
  const notFound = {
    success: false,
    error: `${store.label} existiert nicht mehr`,
  }

  switch (entry.changeType) {
    case "create": {
      const current = await store.findById(entry.entityId)
      if (!current) return notFound
      await store.delete(entry.entityId)
      await log({
        entityId: entry.entityId,
        changeType: "delete",
        before: current,
        after: null,
        changedFields: Object.keys(current),
      })
      return { success: true, action: "deleted" }
    }

    case "update": {
      const current = await store.findById(entry.entityId)
      if (!current) return notFound
      const changedFields = entry.changedFields ?? []
      const updated = await store.update(
        entry.entityId,
        pick(entry.beforeValues ?? {}, changedFields),
      )
      await log({
        entityId: entry.entityId,
        changeType: "update",
        before: current,
        after: updated ?? null,
        changedFields,
      })
      return { success: true, action: "restored" }
    }

    case "delete": {
      if (!entry.beforeValues) {
        return {
          success: false,
          error: "Keine Daten zum Wiederherstellen vorhanden",
        }
      }
      const data = store.prepareRestore
        ? store.prepareRestore(entry.beforeValues)
        : entry.beforeValues
      const restored = await store.restore(data)
      if (!restored) {
        return { success: false, error: "Fehler beim Wiederherstellen" }
      }
      await log({
        entityId: restored.id,
        changeType: "create",
        before: null,
        after: restored,
        changedFields: Object.keys(data),
      })
      return { success: true, action: "restored", newId: restored.id }
    }

    default:
      return { success: false, error: "Unbekannter Änderungstyp" }
  }
}

/** The given fields of the saved values, skipping those it doesn't have */
function pick(saved: Fields, fields: string[]): Fields {
  return Object.fromEntries(
    fields.filter((field) => field in saved).map((f) => [f, saved[f]]),
  )
}
