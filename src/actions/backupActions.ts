import fs from "node:fs"
import path from "node:path"
import { createServerFn } from "@tanstack/react-start"
import PizZip from "pizzip"
import { db } from "../db"
import { ItemTable, LocationTable } from "../drizzle/schema"

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
