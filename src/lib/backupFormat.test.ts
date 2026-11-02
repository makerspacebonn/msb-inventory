import { getTableName, is } from "drizzle-orm"
import { PgTable } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import * as schema from "../drizzle/schema"
import {
  BACKED_UP_TABLES,
  BACKUP_FORMAT_VERSION,
  EXCLUDED_TABLES,
  parseBackupData,
} from "./backupFormat"

describe("backup table coverage", () => {
  it("covers every schema table, either backed up or deliberately excluded", () => {
    const schemaTables = Object.values(schema)
      .filter((value) => is(value, PgTable))
      .map((table) => getTableName(table as PgTable))
      .sort()

    const handled = [...BACKED_UP_TABLES, ...Object.keys(EXCLUDED_TABLES)]

    expect(handled.sort()).toEqual(schemaTables)
  })
})

describe("parseBackupData", () => {
  it("reads a current backup and turns timestamps back into dates", () => {
    const data = parseBackupData(
      JSON.stringify({
        formatVersion: BACKUP_FORMAT_VERSION,
        exportedAt: "2026-11-01T10:00:00.000Z",
        tables: {
          users: [
            { id: "u1", name: "Anna", createdAt: "2026-01-01T00:00:00.000Z" },
          ],
          categories: [{ id: 3, name: "Werkzeug" }],
          locations: [{ id: 1, name: "Regal" }],
          items: [
            { id: 7, name: "Hammer", createdAt: "2026-02-01T00:00:00.000Z" },
          ],
          changelog: [
            {
              id: 1,
              entityType: "item",
              entityId: 7,
              changeType: "create",
              changedAt: "2026-02-01T00:00:00.000Z",
            },
          ],
        },
      }),
    )

    expect(data.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(data.tables.users[0].createdAt).toEqual(
      new Date("2026-01-01T00:00:00.000Z"),
    )
    expect(data.tables.items[0].createdAt).toBeInstanceOf(Date)
    expect(data.tables.changelog[0].changedAt).toBeInstanceOf(Date)
    expect(data.tables.categories).toEqual([{ id: 3, name: "Werkzeug" }])
  })

  it("restores old backups that only contain items and locations", () => {
    const data = parseBackupData(
      JSON.stringify({
        exportedAt: "2025-06-01T10:00:00.000Z",
        tables: {
          locations: [{ id: 1, name: "Regal" }],
          items: [
            { id: 1, name: "Hammer", category: "Werkzeug" },
            { id: 2, name: "Zange", category: " Werkzeug " },
            { id: 3, name: "Kabel", category: "Elektronik" },
            { id: 4, name: "Ohne", category: null },
          ],
        },
      }),
    )

    expect(data.formatVersion).toBe(1)
    expect(data.tables.users).toEqual([])
    expect(data.tables.changelog).toEqual([])
    expect(data.tables.locations).toHaveLength(1)
    expect(data.tables.categories).toEqual([
      { name: "Elektronik" },
      { name: "Werkzeug" },
    ])
  })

  it("rejects backups from a newer format", () => {
    expect(() =>
      parseBackupData(
        JSON.stringify({
          formatVersion: BACKUP_FORMAT_VERSION + 1,
          exportedAt: "2027-01-01T00:00:00.000Z",
          tables: {},
        }),
      ),
    ).toThrow(/newer than supported/)
  })
})
