import fs from "node:fs"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import yauzl from "yauzl"
import yazl from "yazl"

// Backup zips are streamed from and to disk, so their size isn't limited by
// the server's memory: images go straight from file to zip and back.
//
// Note: @types/yauzl declares promise helpers (openPromise, ...) that
// yauzl 3.2 doesn't have, so only the callback API is used here.

export const DATABASE_ENTRY = "database.json"

/** A folder of images and its name inside the zip */
export type ImageFolder = { name: string; dir: string }

/**
 * Writes a backup zip with the database export and all images. The zip is
 * written to a temporary file first, so a backup that fails halfway never
 * shows up as a (broken) .zip.
 */
export async function writeBackupArchive(
  zipPath: string,
  databaseJson: string,
  imageFolders: ImageFolder[],
): Promise<void> {
  const partialPath = `${zipPath}.partial`
  const zip = new yazl.ZipFile()
  const out = fs.createWriteStream(partialPath)
  const written = pipeline(zip.outputStream, out)
  // yazl reports file errors (e.g. an image deleted meanwhile) on the
  // ZipFile, not on its stream: end the pipeline so `written` rejects
  zip.on("error", (error: Error) => out.destroy(error))

  try {
    zip.addBuffer(Buffer.from(databaseJson), DATABASE_ENTRY)

    for (const { name, dir } of imageFolders) {
      if (!fs.existsSync(dir)) continue
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        // Images are already compressed; deflating them again only costs CPU
        zip.addFile(path.join(dir, entry.name), `${name}/${entry.name}`, {
          compress: false,
        })
      }
    }

    zip.end()
    await written
    await fs.promises.rename(partialPath, zipPath)
  } catch (error) {
    out.destroy()
    await written.catch(() => {})
    await fs.promises.rm(partialPath, { force: true })
    throw error
  }
}

/** Calls `onEntry` for each file in the zip, one after another */
function forEachEntry(
  zipPath: string,
  onEntry: (entry: yauzl.Entry, zip: yauzl.ZipFile) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openError, zip) => {
      if (openError) return reject(openError)
      const fail = (error: unknown) => {
        zip.close()
        reject(error)
      }
      zip.on("error", fail)
      zip.on("end", () => resolve())
      zip.on("entry", (entry: yauzl.Entry) => {
        // Folder entries end with "/"
        if (entry.fileName.endsWith("/")) return zip.readEntry()
        onEntry(entry, zip).then(() => zip.readEntry(), fail)
      })
      zip.readEntry()
    })
  })
}

function openEntry(zip: yauzl.ZipFile, entry: yauzl.Entry) {
  return new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) =>
      error ? reject(error) : resolve(stream),
    )
  })
}

/** Reads the database export from a backup zip, or null if it's missing */
export async function readBackupDatabase(
  zipPath: string,
): Promise<string | null> {
  let databaseJson: string | null = null
  await forEachEntry(zipPath, async (entry, zip) => {
    if (entry.fileName !== DATABASE_ENTRY) return
    const chunks: Buffer[] = []
    for await (const chunk of await openEntry(zip, entry)) {
      chunks.push(chunk as Buffer)
    }
    databaseJson = Buffer.concat(chunks).toString("utf8")
  })
  return databaseJson
}

/**
 * Extracts the images of a backup zip into their folders, streaming each
 * file to disk. Returns the number of extracted images.
 */
export async function extractBackupImages(
  zipPath: string,
  imageFolders: ImageFolder[],
): Promise<number> {
  for (const { dir } of imageFolders) {
    await fs.promises.mkdir(dir, { recursive: true })
  }

  let extracted = 0
  await forEachEntry(zipPath, async (entry, zip) => {
    const folderName = entry.fileName.split("/")[0]
    const folder = imageFolders.find(({ name }) => name === folderName)
    if (!folder) return
    // basename keeps an entry from writing outside its image folder
    const target = path.join(folder.dir, path.basename(entry.fileName))
    await pipeline(await openEntry(zip, entry), fs.createWriteStream(target))
    extracted++
  })
  return extracted
}
