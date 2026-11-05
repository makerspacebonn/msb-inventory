import fs from "node:fs"
import path from "node:path"
import { v7 as uuidv7 } from "uuid"
import { AppError } from "./errors"

/** Subfolders of SAVE_PATH that hold uploaded images */
export type ImageFolder = "items" | "locations"

/** Image formats accepted for uploads, mapped to their file extension */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

/**
 * Parses a base64 data URL from an image upload. Only known image formats
 * are accepted, so the file extension never comes from untrusted input.
 */
export function parseImageDataUrl(dataUrl: string): {
  extension: string
  buffer: Buffer
} {
  const match = dataUrl.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i)
  if (!match) {
    throw new AppError("INVALID_INPUT", "Ungültiges Bildformat")
  }

  const extension = ALLOWED_IMAGE_TYPES[match[1].toLowerCase()]
  if (!extension) {
    throw new AppError(
      "INVALID_INPUT",
      `Bildtyp ${match[1]} wird nicht unterstützt`,
    )
  }

  return { extension, buffer: Buffer.from(match[2], "base64") }
}

// Read at call time, so tests can point it at a temporary directory
function folderPath(folder: ImageFolder): string {
  return path.join(process.env.SAVE_PATH ?? "", folder)
}

/** Writes an uploaded base64 image to disk and returns its file name */
export async function storeImage(
  dataUrl: string,
  folder: ImageFolder,
): Promise<string> {
  const { extension, buffer } = parseImageDataUrl(dataUrl)
  const dir = folderPath(folder)
  await fs.promises.mkdir(dir, { recursive: true })
  const fileName = `${uuidv7()}.${extension}`
  await fs.promises.writeFile(path.join(dir, fileName), buffer)
  return fileName
}
