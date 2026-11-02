import { getTableColumns, type Table } from "drizzle-orm"
import {
  type CategoryInsert,
  CategoryTable,
  type ChangelogInsert,
  ChangelogTable,
  type ItemInsert,
  ItemTable,
  type LocationInsert,
  LocationTable,
  type UserInsert,
  UserTable,
} from "../drizzle/schema"

// v1 backups (no formatVersion) only contained items and locations
export const BACKUP_FORMAT_VERSION = 2

// Every table in the schema must appear in exactly one of these lists,
// so a new table can't be silently left out of backups.
export const BACKED_UP_TABLES = [
  "users",
  "categories",
  "locations",
  "items",
  "changelog",
] as const

export const EXCLUDED_TABLES = {
  sessions: "Login sessions are short-lived and tied to the running instance",
  accounts: "OAuth credentials are recreated on the next login",
  verifications: "Short-lived email verification tokens",
  projects: "Unused, to be removed (OPS-003)",
} as const

export interface BackupTables {
  users: UserInsert[]
  categories: CategoryInsert[]
  locations: LocationInsert[]
  items: ItemInsert[]
  changelog: ChangelogInsert[]
}

export interface BackupData {
  formatVersion: number
  exportedAt: string
  tables: BackupTables
}

// JSON turns timestamps into strings; Drizzle expects Date objects again
function reviveDates<T>(table: Table, rows: unknown[] | undefined): T[] {
  const dateColumns = Object.entries(getTableColumns(table))
    .filter(([, column]) => column.dataType === "date")
    .map(([key]) => key)

  return (rows ?? []).map((row) => {
    const revived = { ...(row as Record<string, unknown>) }
    for (const key of dateColumns) {
      if (typeof revived[key] === "string") {
        revived[key] = new Date(revived[key] as string)
      }
    }
    return revived as T
  })
}

// Older backups had no categories table; rebuild it from the item values
function deriveCategories(items: ItemInsert[]): CategoryInsert[] {
  const names = new Set<string>()
  for (const item of items) {
    const name = item.category?.trim()
    if (name) names.add(name)
  }
  return [...names].sort().map((name) => ({ name }))
}

export function parseBackupData(json: string): BackupData {
  const raw = JSON.parse(json) as {
    formatVersion?: number
    exportedAt: string
    tables: Partial<Record<keyof BackupTables, unknown[]>>
  }
  const formatVersion = raw.formatVersion ?? 1

  if (formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Backup format ${formatVersion} is newer than supported (${BACKUP_FORMAT_VERSION})`,
    )
  }

  const items = reviveDates<ItemInsert>(ItemTable, raw.tables.items)

  return {
    formatVersion,
    exportedAt: raw.exportedAt,
    tables: {
      users: reviveDates<UserInsert>(UserTable, raw.tables.users),
      categories: raw.tables.categories
        ? reviveDates<CategoryInsert>(CategoryTable, raw.tables.categories)
        : deriveCategories(items),
      locations: reviveDates<LocationInsert>(
        LocationTable,
        raw.tables.locations,
      ),
      items,
      changelog: reviveDates<ChangelogInsert>(
        ChangelogTable,
        raw.tables.changelog,
      ),
    },
  }
}
