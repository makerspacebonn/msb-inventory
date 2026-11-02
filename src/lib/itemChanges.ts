/**
 * Returns the keys whose values differ between two snapshots of an entity.
 * Values are compared structurally, so arrays and objects (tags, links,
 * location markers) only count as changed when their content changes.
 */
export function diffFields<T extends object>(
  before: T,
  after: T,
  keys: readonly string[],
): string[] {
  return keys.filter(
    (key) =>
      JSON.stringify(before[key as keyof T]) !==
      JSON.stringify(after[key as keyof T]),
  )
}

/** Image formats accepted for item photos, mapped to their file extension */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

/**
 * Parses a base64 data URL from the image upload. Only known image formats
 * are accepted, so the file extension never comes from untrusted input.
 */
export function parseImageDataUrl(dataUrl: string): {
  extension: string
  buffer: Buffer
} {
  const match = dataUrl.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i)
  if (!match) {
    throw new Error("Ungültiges Bildformat")
  }

  const extension = ALLOWED_IMAGE_TYPES[match[1].toLowerCase()]
  if (!extension) {
    throw new Error(`Bildtyp ${match[1]} wird nicht unterstützt`)
  }

  return { extension, buffer: Buffer.from(match[2], "base64") }
}
