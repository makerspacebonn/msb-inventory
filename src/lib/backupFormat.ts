import { getTableColumns, type Table } from "drizzle-orm"
import {
  type CategoryInsert,
  CategoryTable,
  type ChangelogInsert,
  ChangelogTable,
  type ItemInsert,
  ItemTable,
  type ItemViewInsert,
  type LocationInsert,
  LocationTable,
  type SearchCountInsert,
  type UserInsert,
  UserTable,
} from "../drizzle/schema"
import { AppError } from "./errors"

// v1 backups (no formatVersion) only contained items and locations;
// v2 had no search counts and item views
export const BACKUP_FORMAT_VERSION = 3

// Every table in the schema must appear in exactly one of these lists,
// so a new table can't be silently left out of backups.
export const BACKED_UP_TABLES = [
  "users",
  "categories",
  "locations",
  "items",
  "changelog",
  "search_counts",
  "item_views",
] as const

export const EXCLUDED_TABLES = {
  sessions: "Login sessions are short-lived and tied to the running instance",
  accounts: "OAuth credentials are recreated on the next login",
  verifications: "Short-lived email verification tokens",
  maintenance_tasks:
    "Which one-off data tasks ran on this installation; a restored server runs them itself",
} as const

export interface BackupTables {
  users: UserInsert[]
  categories: CategoryInsert[]
  // Insert types leave out generated ids, but backups keep them: restoring
  // writes the original ids, so references between rows stay valid
  locations: (LocationInsert & { id?: number })[]
  items: ItemInsert[]
  changelog: ChangelogInsert[]
  /** Missing in backups before v3: restoring one keeps the current counts */
  searchCounts?: SearchCountInsert[]
  /** Missing in backups before v3 */
  itemViews?: ItemViewInsert[]
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
    throw new AppError(
      "INVALID_INPUT",
      `Das Backup hat Format ${formatVersion}, unterstützt wird bis ${BACKUP_FORMAT_VERSION}. Bitte die App aktualisieren.`,
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
      searchCounts: raw.tables.searchCounts as SearchCountInsert[] | undefined,
      itemViews: raw.tables.itemViews as ItemViewInsert[] | undefined,
    },
  }
}
