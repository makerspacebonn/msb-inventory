import fs from "node:fs"
import path from "node:path"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import { AppError } from "@/src/lib/errors"
import { adminGuardMiddleware } from "@/src/middleware/authMiddleware"
import { db } from "../db"
import {
  CategoryTable,
  ChangelogTable,
  ItemTable,
  ItemViewTable,
  LocationTable,
  SearchCountTable,
  UserTable,
} from "../drizzle/schema"
import {
  extractBackupImages,
  readBackupDatabase,
  writeBackupArchive,
} from "../lib/backupArchive"
import {
  BACKUP_FORMAT_VERSION,
  type BackupData,
  parseBackupData,
} from "../lib/backupFormat"

const SAVE_PATH = process.env.SAVE_PATH || ""
const BACKUPS_DIR = path.join(SAVE_PATH, "backups")
const IMAGE_FOLDERS = [
  { name: "items", dir: path.join(SAVE_PATH, "items") },
  { name: "locations", dir: path.join(SAVE_PATH, "locations") },
]

export interface BackupInfo {
  filename: string
  size: number
  sizeFormatted: string
  createdAt: Date
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const generateBackup = createServerFn()
  .middleware([adminGuardMiddleware])
  .handler(async (): Promise<BackupInfo> => {
    // Ensure backups directory exists
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupName = `backup-${timestamp}`
    const zipPath = path.join(BACKUPS_DIR, `${backupName}.zip`)

    // Export database tables
    const [
      users,
      categories,
      locations,
      items,
      changelog,
      searchCounts,
      itemViews,
    ] = await Promise.all([
      db.select().from(UserTable),
      db.select().from(CategoryTable),
      db.select().from(LocationTable),
      db.select().from(ItemTable),
      db.select().from(ChangelogTable),
      db.select().from(SearchCountTable),
      db.select().from(ItemViewTable),
    ])

    const databaseExport: BackupData = {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        users,
        categories,
        locations,
        items,
        changelog,
        searchCounts,
        itemViews,
      },
    }

    // Streams the images from disk into the zip, so the backup size isn't
    // limited by the server's memory
    await writeBackupArchive(
      zipPath,
      JSON.stringify(databaseExport, null, 2),
      IMAGE_FOLDERS,
    )

    // Get file size
    const stats = fs.statSync(zipPath)

    return {
      filename: `${backupName}.zip`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.birthtime,
    }
  })

export const listBackups = createServerFn()
  .middleware([adminGuardMiddleware])
  .handler(async (): Promise<BackupInfo[]> => {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return []
    }

    const files = fs.readdirSync(BACKUPS_DIR)
    const backups: BackupInfo[] = []

    for (const file of files) {
      if (file.endsWith(".zip")) {
        const filePath = path.join(BACKUPS_DIR, file)
        const stats = fs.statSync(filePath)
        backups.push({
          filename: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.birthtime,
        })
      }
    }

    // Sort by creation date, newest first
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return backups
  })

export const deleteBackup = createServerFn()
  .middleware([adminGuardMiddleware])
  .validator((filename: string) => filename)
  .handler(async ({ data: filename }): Promise<{ success: boolean }> => {
    const filePath = path.join(BACKUPS_DIR, filename)

    // Security: ensure the file is within the backups directory
    if (!filePath.startsWith(BACKUPS_DIR) || !filename.endsWith(".zip")) {
      throw new AppError("INVALID_INPUT", "Ungültiger Backup-Dateiname")
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return { success: true }
    }

    return { success: false }
  })

export interface RestoreResult {
  success: boolean
  itemsRestored: number
  locationsRestored: number
  categoriesRestored: number
  changelogRestored: number
  /** Days with search counts; null when the backup has none (before v3) */
  searchDaysRestored: number | null
  /** Rows of item views; null when the backup has none (before v3) */
  itemViewsRestored: number | null
  usersAdded: number
  imagesRestored: number
}

// Stays well below Postgres' limit of 65535 bind parameters per statement
const INSERT_CHUNK_SIZE = 500

function chunk<T>(rows: T[]): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + INSERT_CHUNK_SIZE))
  }
  return chunks
}

export const restoreBackup = createServerFn()
  .middleware([adminGuardMiddleware])
  .validator((filename: string) => filename)
  .handler(async ({ data: filename }): Promise<RestoreResult> => {
    const filePath = path.join(BACKUPS_DIR, filename)

    // Security: ensure the file is within the backups directory
    if (!filePath.startsWith(BACKUPS_DIR) || !filename.endsWith(".zip")) {
      throw new AppError("INVALID_INPUT", "Ungültiger Backup-Dateiname")
    }

    if (!fs.existsSync(filePath)) {
      throw new AppError("NOT_FOUND", "Backup nicht gefunden")
    }

    const databaseJson = await readBackupDatabase(filePath)
    if (databaseJson === null) {
      throw new AppError(
        "INVALID_INPUT",
        "Ungültiges Backup: database.json fehlt",
      )
    }

    // Parse before touching anything, so a broken backup changes nothing
    const backupData = parseBackupData(databaseJson)
    const {
      users,
      categories,
      locations,
      items,
      changelog,
      searchCounts,
      itemViews,
    } = backupData.tables

    // All-or-nothing: if any insert fails, the current data stays untouched
    const usersAdded = await db.transaction(async (tx) => {
      // Users are only added, never replaced or deleted: existing users keep
      // their sessions, and the restoring admin can't lock themselves out
      let added = 0
      for (const rows of chunk(users)) {
        const inserted = await tx
          .insert(UserTable)
          .values(rows)
          .onConflictDoNothing()
          .returning({ id: UserTable.id })
        added += inserted.length
      }

      // Changelog and categories have no FKs; items reference locations
      await tx.delete(ChangelogTable)
      // Item views belong to the items being replaced
      await tx.delete(ItemViewTable)
      await tx.delete(ItemTable)
      await tx.delete(LocationTable)
      await tx.delete(CategoryTable)

      for (const rows of chunk(categories)) {
        await tx.insert(CategoryTable).overridingSystemValue().values(rows)
      }

      // Locations reference their parent, which may come later in the list:
      // insert all without parent first, then link them up
      for (const rows of chunk(locations)) {
        await tx
          .insert(LocationTable)
          .overridingSystemValue()
          .values(rows.map((loc) => ({ ...loc, parentId: null })))
      }
      for (const loc of locations) {
        if (loc.parentId && loc.id) {
          await tx
            .update(LocationTable)
            .set({ parentId: loc.parentId })
            .where(eq(LocationTable.id, loc.id))
        }
      }

      for (const rows of chunk(items)) {
        await tx.insert(ItemTable).overridingSystemValue().values(rows)
      }
      for (const rows of chunk(changelog)) {
        await tx.insert(ChangelogTable).overridingSystemValue().values(rows)
      }

      for (const rows of chunk(itemViews ?? [])) {
        await tx.insert(ItemViewTable).values(rows)
      }

      // Older backups have no search counts: the current ones stay
      if (searchCounts) {
        await tx.delete(SearchCountTable)
        for (const rows of chunk(searchCounts)) {
          await tx.insert(SearchCountTable).values(rows)
        }
      }

      // Continue ids after the highest restored one
      for (const table of ["categories", "locations", "items", "changelog"]) {
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'), COALESCE((SELECT MAX(id) FROM ${sql.identifier(table)}), 0) + 1, false)`,
        )
      }

      return added
    })

    // Images only after the database commit, so a failed restore leaves
    // them as they were
    const imagesRestored = await extractBackupImages(filePath, IMAGE_FOLDERS)

    return {
      success: true,
      itemsRestored: items.length,
      locationsRestored: locations.length,
      categoriesRestored: categories.length,
      changelogRestored: changelog.length,
      searchDaysRestored: searchCounts?.length ?? null,
      itemViewsRestored: itemViews?.length ?? null,
      usersAdded,
      imagesRestored,
    }
  })
