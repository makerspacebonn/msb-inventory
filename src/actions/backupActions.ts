import fs from "node:fs"
import path from "node:path"
import { createServerFn } from "@tanstack/react-start"
import { sql } from "drizzle-orm"
import PizZip from "pizzip"
import { db } from "../db"
import {
  ItemTable,
  type ItemInsert,
  LocationTable,
  type LocationInsert,
} from "../drizzle/schema"

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

export const generateBackup = createServerFn().handler(
  async (): Promise<BackupInfo> => {
    // Ensure backups directory exists
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupName = `backup-${timestamp}`
    const zipPath = path.join(BACKUPS_DIR, `${backupName}.zip`)

    // Export database tables
    const [items, locations] = await Promise.all([
      db.select().from(ItemTable),
      db.select().from(LocationTable),
    ])

    const databaseExport = {
      exportedAt: new Date().toISOString(),
      tables: {
        items,
        locations,
      },
    }

    // Create zip
    const zip = new PizZip()

    // Add database.json
    zip.file("database.json", JSON.stringify(databaseExport, null, 2))

    // Add images
    addImagesToZip(zip, path.join(SAVE_PATH, "items"), "items")
    addImagesToZip(zip, path.join(SAVE_PATH, "locations"), "locations")

    // Generate zip buffer and write to file
    const zipBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
    fs.writeFileSync(zipPath, zipBuffer)

    // Get file size
    const stats = fs.statSync(zipPath)

    return {
      filename: `${backupName}.zip`,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.birthtime,
    }
  },
)

export const listBackups = createServerFn().handler(
  async (): Promise<BackupInfo[]> => {
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
  },
)

export const deleteBackup = createServerFn()
  .inputValidator((filename: string) => filename)
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
  imagesRestored: number
}

export const restoreBackup = createServerFn()
  .inputValidator((filename: string) => filename)
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

    const databaseContent = databaseFile.asText()
    const backupData = JSON.parse(databaseContent) as {
      exportedAt: string
      tables: {
        items: ItemInsert[]
        locations: LocationInsert[]
      }
    }

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

    // Clear existing data and restore from backup
    // Order matters due to foreign key constraints
    await db.delete(ItemTable)
    await db.delete(LocationTable)

    // Reset sequences
    await db.execute(sql`ALTER SEQUENCE items_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE locations_id_seq RESTART WITH 1`)

    // Insert locations first (items depend on locations)
    let locationsRestored = 0
    if (backupData.tables.locations.length > 0) {
      // Insert locations without parentId first using OVERRIDING SYSTEM VALUE
      for (const loc of backupData.tables.locations) {
        await db.execute(sql`
          INSERT INTO locations (id, name, description, parent_id, "parentLocationMarker", image_path, "additionalInfo")
          OVERRIDING SYSTEM VALUE
          VALUES (
            ${loc.id},
            ${loc.name},
            ${loc.description ?? null},
            NULL,
            ${loc.parentLocationMarker ? JSON.stringify(loc.parentLocationMarker) : null}::json,
            ${loc.imagePath ?? null},
            ${loc.additionalInfo ? JSON.stringify(loc.additionalInfo) : null}::json
          )
        `)
      }

      // Update parentIds
      for (const loc of backupData.tables.locations) {
        if (loc.parentId) {
          await db.execute(
            sql`UPDATE locations SET parent_id = ${loc.parentId} WHERE id = ${loc.id}`,
          )
        }
      }
      locationsRestored = backupData.tables.locations.length
    }

    // Insert items using OVERRIDING SYSTEM VALUE
    let itemsRestored = 0
    for (const item of backupData.tables.items) {
      await db.execute(sql`
        INSERT INTO items (id, name, description, location_id, "parentLocationMarker", image_path, "additionalInfo", tags, manufacturer, model, category, links, morestuff)
        OVERRIDING SYSTEM VALUE
        VALUES (
          ${item.id},
          ${item.name},
          ${item.description ?? null},
          ${item.locationId ?? null},
          ${item.parentLocationMarker ? JSON.stringify(item.parentLocationMarker) : null}::json,
          ${item.imagePath ?? null},
          ${item.additionalInfo ? JSON.stringify(item.additionalInfo) : null}::json,
          ${item.tags && item.tags.length > 0 ? `{${item.tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}` : null}::varchar[],
          ${item.manufacturer ?? null},
          ${item.model ?? null},
          ${item.category ?? null},
          ${item.links ? JSON.stringify(item.links) : null}::json,
          ${item.morestuff ?? null}
        )
      `)
      itemsRestored++
    }

    // Update sequences to max id + 1
    await db.execute(
      sql`SELECT setval('items_id_seq', COALESCE((SELECT MAX(id) FROM items), 0) + 1, false)`,
    )
    await db.execute(
      sql`SELECT setval('locations_id_seq', COALESCE((SELECT MAX(id) FROM locations), 0) + 1, false)`,
    )

    return {
      success: true,
      itemsRestored,
      locationsRestored,
      imagesRestored,
    }
  })
