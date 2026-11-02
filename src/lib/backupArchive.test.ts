import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import yazl from "yazl"
import {
  extractBackupImages,
  readBackupDatabase,
  writeBackupArchive,
} from "./backupArchive"

describe("backup archive", () => {
  let root: string
  const dir = (...parts: string[]) => path.join(root, ...parts)

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "msb-backup-"))
    fs.mkdirSync(dir("src", "items"), { recursive: true })
    fs.mkdirSync(dir("src", "locations"), { recursive: true })
    fs.writeFileSync(dir("src", "items", "a.jpg"), "item image a")
    fs.writeFileSync(dir("src", "items", "b.png"), "item image b")
    fs.writeFileSync(dir("src", "locations", "c.webp"), "location image c")
    // Subfolders (like the image cache) are not part of a backup
    fs.mkdirSync(dir("src", "items", ".cache"))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const folders = (base: string) => [
    { name: "items", dir: dir(base, "items") },
    { name: "locations", dir: dir(base, "locations") },
  ]

  it("round-trips the database export and all images", async () => {
    const zipPath = dir("backup.zip")
    const json = JSON.stringify({ tables: { items: [{ name: "Lötkolben" }] } })

    await writeBackupArchive(zipPath, json, folders("src"))

    expect(await readBackupDatabase(zipPath)).toBe(json)
    expect(await extractBackupImages(zipPath, folders("restored"))).toBe(3)
    expect(fs.readFileSync(dir("restored", "items", "b.png"), "utf8")).toBe(
      "item image b",
    )
    expect(
      fs.readFileSync(dir("restored", "locations", "c.webp"), "utf8"),
    ).toBe("location image c")
  })

  it("skips image folders that don't exist", async () => {
    const zipPath = dir("backup.zip")
    await writeBackupArchive(zipPath, "{}", [
      { name: "items", dir: dir("missing") },
    ])

    expect(await readBackupDatabase(zipPath)).toBe("{}")
    expect(await extractBackupImages(zipPath, folders("restored"))).toBe(0)
  })

  it("leaves no zip behind when writing fails", async () => {
    const zipPath = dir("backup.zip")
    // An image folder that is a file makes reading it fail
    fs.writeFileSync(dir("not-a-folder"), "x")

    await expect(
      writeBackupArchive(zipPath, "{}", [
        { name: "items", dir: dir("not-a-folder") },
      ]),
    ).rejects.toThrow()

    expect(fs.readdirSync(root).filter((f) => f.startsWith("backup"))).toEqual(
      [],
    )
  })

  it("returns null for a zip without database export", async () => {
    // A zip that only contains an image
    const zipPath = dir("images-only.zip")
    const zip = new yazl.ZipFile()
    zip.addBuffer(Buffer.from("x"), "items/a.jpg")
    zip.end()
    await pipeline(zip.outputStream, fs.createWriteStream(zipPath))

    expect(await readBackupDatabase(zipPath)).toBeNull()
  })
})
