import fs from "node:fs"
import path from "node:path"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import PizZip from "pizzip"
import { adminGuardMiddleware } from "@/src/middleware/authMiddleware"
import { db } from "../db"
import {
  CategoryTable,
  ChangelogTable,
  ItemTable,
  LocationTable,
  UserTable,
} from "../drizzle/schema"
import {
  BACKUP_FORMAT_VERSION,
  type BackupData,
  parseBackupData,
} from "../lib/backupFormat"

const SAVE_PATH = process.env.SAVE_PATH || ""
const BACKUPS_DIR = path.join(SAVE_PATH, "backups")

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

function addImagesToZip(zip: PizZip, dir: string, zipFolder: string): void {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      if (fs.statSync(filePath).isFile()) {
        const buffer = fs.readFileSync(filePath)
        zip.file(`${zipFolder}/${file}`, buffer)
      }
    }
  }
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
    const [users, categories, locations, items, changelog] = await Promise.all([
      db.select().from(UserTable),
      db.select().from(CategoryTable),
      db.select().from(LocationTable),
      db.select().from(ItemTable),
      db.select().from(ChangelogTable),
    ])

    const databaseExport: BackupData = {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      tables: { users, categories, locations, items, changelog },
    }

    // Create zip
    const zip = new PizZip()

    // Add database.json
    zip.file("database.json", JSON.stringify(databaseExport, null, 2))

    // Add images
    addImagesToZip(zip, path.join(SAVE_PATH, "items"), "items")
    addImagesToZip(zip, path.join(SAVE_PATH, "locations"), "locations")

    // Generate zip buffer and write to file
    const zipBuffer = zip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })
    fs.writeFileSync(zipPath, zipBuffer)

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
      throw new Error("Invalid backup filename")
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
      throw new Error("Invalid backup filename")
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("Backup file not found")
    }

    // Read and parse zip file
    const zipBuffer = fs.readFileSync(filePath)
    const zip = new PizZip(zipBuffer)

    // Parse database.json
    const databaseFile = zip.file("database.json")
    if (!databaseFile) {
      throw new Error("Invalid backup: database.json not found")
    }

    // Parse before touching anything, so a broken backup changes nothing
    const backupData = parseBackupData(databaseFile.asText())
    const { users, categories, locations, items, changelog } = backupData.tables

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

      // Continue ids after the highest restored one
      for (const table of ["categories", "locations", "items", "changelog"]) {
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'), COALESCE((SELECT MAX(id) FROM ${sql.identifier(table)}), 0) + 1, false)`,
        )
      }

      return added
    })

    // Images only after the database commit, so a failed restore leaves them as they were
    // Ensure image directories exist
    const itemsImageDir = path.join(SAVE_PATH, "items")
    const locationsImageDir = path.join(SAVE_PATH, "locations")
    fs.mkdirSync(itemsImageDir, { recursive: true })
    fs.mkdirSync(locationsImageDir, { recursive: true })

    // Extract images
    let imagesRestored = 0
    const zipFiles = zip.files
    for (const relativePath of Object.keys(zipFiles)) {
      const file = zipFiles[relativePath]
      if (file.dir) continue

      if (relativePath.startsWith("items/")) {
        const imgFilename = path.basename(relativePath)
        const destPath = path.join(itemsImageDir, imgFilename)
        fs.writeFileSync(destPath, file.asNodeBuffer())
        imagesRestored++
      } else if (relativePath.startsWith("locations/")) {
        const imgFilename = path.basename(relativePath)
        const destPath = path.join(locationsImageDir, imgFilename)
        fs.writeFileSync(destPath, file.asNodeBuffer())
        imagesRestored++
      }
    }

    return {
      success: true,
      itemsRestored: items.length,
      locationsRestored: locations.length,
      categoriesRestored: categories.length,
      changelogRestored: changelog.length,
      usersAdded,
      imagesRestored,
    }
  })
