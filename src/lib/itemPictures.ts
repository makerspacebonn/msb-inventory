import { AppError } from "./errors"

/** Main picture included */
export const MAX_ITEM_PICTURES = 6

/**
 * A picture in the item form: one the item already has (its file name), or
 * a new one as a data URL, stored when the item is saved
 */
export type ItemPicture = { path: string } | { upload: string }

/** The item's pictures in order, the main picture first */
export function picturePaths(item: {
  imagePath: string | null
  extraImagePaths?: string[] | null
}): string[] {
  return [
    ...(item.imagePath ? [item.imagePath] : []),
    ...(item.extraImagePaths ?? []),
  ]
}

/**
 * Whether a name can only mean a file in the image folder: no folders, and
 * not hidden. Older images may have other names than the generated ones
 */
export function isImageFileName(name: string): boolean {
  return name.length > 0 && !/[\\/]/.test(name) && !name.startsWith(".")
}

/**
 * Turns the form's pictures into the stored columns. New pictures are
 * stored with `store`; kept ones must belong to the item, so a request
 * can't attach files of other items
 */
export async function resolvePictures(
  pictures: ItemPicture[],
  currentPaths: string[],
  store: (dataUrl: string) => Promise<string>,
): Promise<{ imagePath: string | null; extraImagePaths: string[] }> {
  if (pictures.length > MAX_ITEM_PICTURES) {
    throw new AppError(
      "INVALID_INPUT",
      `Ein Item kann höchstens ${MAX_ITEM_PICTURES} Bilder haben`,
    )
  }
  for (const picture of pictures) {
    if ("path" in picture && !currentPaths.includes(picture.path)) {
      throw new AppError("INVALID_INPUT", "Unbekanntes Bild")
    }
  }

  const paths: string[] = []
  for (const picture of pictures) {
    paths.push("path" in picture ? picture.path : await store(picture.upload))
  }
  return { imagePath: paths[0] ?? null, extraImagePaths: paths.slice(1) }
}

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

/** The MIME type of a stored image, by its extension; JPEG otherwise */
export function imageMimeType(fileName: string): string {
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? ""
  return MIME_TYPES[extension] ?? "image/jpeg"
}
