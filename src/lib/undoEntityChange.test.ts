import { describe, expect, it } from "vitest"
import type { ChangelogEntry } from "@/src/app/types"
import {
  type RecordedChange,
  type UndoStore,
  undoEntityChange,
} from "./undoEntityChange"

type Thing = { id: number; name: string; note: string | null }

/** A store in memory, so undo can be checked without a database */
function fakeStore(
  things: Thing[],
  prepareRestore?: UndoStore<Thing>["prepareRestore"],
) {
  const rows = new Map(things.map((t) => [t.id, { ...t }]))
  const store: UndoStore<Thing> = {
    entityType: "item",
    label: "Item",
    // Copies, as a database returns a fresh object every time
    findById: async (id) => {
      const row = rows.get(id)
      return row && { ...row }
    },
    delete: async (id) => rows.delete(id),
    update: async (id, fields) => {
      const row = rows.get(id)
      if (!row) return undefined
      Object.assign(row, fields)
      return { ...row }
    },
    restore: async (data) => {
      const row = data as Thing
      rows.set(row.id, { ...row })
      return { ...row }
    },
    prepareRestore,
  }
  return { store, rows }
}

function recorder() {
  const recorded: RecordedChange[] = []
  return {
    recorded,
    record: async (change: RecordedChange) => {
      recorded.push(change)
    },
  }
}

function entry(change: Partial<ChangelogEntry>): ChangelogEntry {
  return {
    id: 1,
    entityType: "item",
    entityId: 7,
    changeType: "update",
    userId: "someone",
    changedAt: new Date(),
    beforeValues: null,
    afterValues: null,
    changedFields: [],
    ...change,
  }
}

const drill: Thing = { id: 7, name: "Bohrer", note: "neu" }

describe("undoEntityChange", () => {
  it("undoes a creation by deleting the entity and logging that", async () => {
    const { store, rows } = fakeStore([drill])
    const { recorded, record } = recorder()

    const result = await undoEntityChange(
      entry({ changeType: "create" }),
      store,
      { userId: "admin", record },
    )

    expect(result).toEqual({ success: true, action: "deleted" })
    expect(rows.has(7)).toBe(false)
    expect(recorded).toEqual([
      {
        entityType: "item",
        entityId: 7,
        changeType: "delete",
        userId: "admin",
        before: drill,
        after: null,
        changedFields: ["id", "name", "note"],
      },
    ])
  })

  it("restores only the changed fields of an update", async () => {
    const { store, rows } = fakeStore([
      { id: 7, name: "Akkubohrer", note: "später geändert" },
    ])
    const { recorded, record } = recorder()

    const result = await undoEntityChange(
      entry({
        changeType: "update",
        beforeValues: { id: 7, name: "Bohrer", note: "alt" },
        changedFields: ["name"],
      }),
      store,
      { userId: "admin", record },
    )

    expect(result).toEqual({ success: true, action: "restored" })
    expect(rows.get(7)).toEqual({
      id: 7,
      name: "Bohrer",
      note: "später geändert",
    })
    expect(recorded[0]).toMatchObject({
      changeType: "update",
      before: { name: "Akkubohrer" },
      after: { name: "Bohrer" },
      changedFields: ["name"],
    })
  })

  it("brings a deleted entity back with its id", async () => {
    const { store, rows } = fakeStore([])
    const { recorded, record } = recorder()

    const result = await undoEntityChange(
      entry({ changeType: "delete", beforeValues: drill }),
      store,
      { userId: "admin", record },
    )

    expect(result).toEqual({ success: true, action: "restored", newId: 7 })
    expect(rows.get(7)).toEqual(drill)
    expect(recorded[0]).toMatchObject({
      changeType: "create",
      entityId: 7,
      before: null,
      after: drill,
    })
  })

  it("prepares the saved values before restoring them", async () => {
    const { store, rows } = fakeStore([], ({ note: _note, ...rest }) => rest)
    const { recorded, record } = recorder()

    await undoEntityChange(
      entry({ changeType: "delete", beforeValues: drill }),
      store,
      { userId: "admin", record },
    )

    expect(rows.get(7)).toEqual({ id: 7, name: "Bohrer" })
    expect(recorded[0]?.changedFields).toEqual(["id", "name"])
  })

  it("names the entity when it no longer exists", async () => {
    const { store } = fakeStore([])
    const { recorded, record } = recorder()

    for (const changeType of ["create", "update"] as const) {
      const result = await undoEntityChange(entry({ changeType }), store, {
        userId: "admin",
        record,
      })
      expect(result).toEqual({
        success: false,
        error: "Item existiert nicht mehr",
      })
    }
    expect(recorded).toEqual([])
  })

  it("fails without saved values for a deletion", async () => {
    const { store } = fakeStore([])
    const { record } = recorder()

    const result = await undoEntityChange(
      entry({ changeType: "delete", beforeValues: null }),
      store,
      { userId: "admin", record },
    )

    expect(result).toEqual({
      success: false,
      error: "Keine Daten zum Wiederherstellen vorhanden",
    })
  })
})
