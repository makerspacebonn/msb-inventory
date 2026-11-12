import fs from "node:fs"
import path from "node:path"
import * as process from "node:process"
import { createFileRoute } from "@tanstack/react-router"
import sharp from "sharp"
import { resolveInside } from "@/src/lib/safePath"

const imageRootPath = process.env.SAVE_PATH || ""
const cacheDir = path.join(imageRootPath, ".cache")

const SIZE_CONFIG = {
  default: { maxSize: 1000, quality: 80, cacheSubDir: "default" },
  s: { maxSize: 200, quality: 60, cacheSubDir: "small" },
  // Item list tiles: sharp on high-density phone screens
  m: { maxSize: 600, quality: 75, cacheSubDir: "medium" },
}

async function getResizedImage(
  originalPath: string,
  cachePath: string,
  maxSize: number,
  quality: number,
): Promise<Buffer> {
  // Ensure cache directory exists
  const cacheFileDir = path.dirname(cachePath)
  if (!fs.existsSync(cacheFileDir)) {
    fs.mkdirSync(cacheFileDir, { recursive: true })
  }

  // Check if cached version exists and is newer than original
  if (fs.existsSync(cachePath)) {
    const originalStat = fs.statSync(originalPath)
    const cacheStat = fs.statSync(cachePath)
    if (cacheStat.mtime > originalStat.mtime) {
      return fs.promises.readFile(cachePath)
    }
  }

  // Resize and cache the image
  const image = sharp(originalPath)
  const metadata = await image.metadata()

  let resizedImage = image

  // Only resize if larger than maxSize
  if (
    (metadata.width && metadata.width > maxSize) ||
    (metadata.height && metadata.height > maxSize)
  ) {
    resizedImage = image.resize(maxSize, maxSize, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  // Apply quality settings based on format
  const format = metadata.format
  if (format === "jpeg") {
    resizedImage = resizedImage.jpeg({ quality })
  } else if (format === "png") {
    resizedImage = resizedImage.png({ quality })
  } else if (format === "webp") {
    resizedImage = resizedImage.webp({ quality })
  }

  const buffer = await resizedImage.toBuffer()

  // Write to cache
  await fs.promises.writeFile(cachePath, buffer)

  return buffer
}

export const Route = createFileRoute("/img/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const imagePath = params._splat
        if (!imagePath) {
          return new Response("Not found", { status: 404 })
        }

        // The router has already decoded %2f / %2e, so the splat can hold "../"
        const originalPath = resolveInside(imageRootPath, imagePath)
        if (!originalPath || !fs.statSync(originalPath).isFile()) {
          return new Response("Not found", { status: 404 })
        }

        // Parse size parameter from URL
        const url = new URL(request.url)
        const sizeParam = url.searchParams.get("size")
        const config =
          sizeParam === "s" || sizeParam === "m"
            ? SIZE_CONFIG[sizeParam]
            : SIZE_CONFIG.default

        // Built from the resolved path: a raw splat with ".." would put the
        // cache file in a stray folder, and one image would get many entries
        const relativePath = path.relative(
          fs.realpathSync(imageRootPath),
          originalPath,
        )
        const cachePath = path.join(cacheDir, config.cacheSubDir, relativePath)

        try {
          const buffer = await getResizedImage(
            originalPath,
            cachePath,
            config.maxSize,
            config.quality,
          )
          const mimeType = imagePath.toLowerCase().endsWith(".png")
            ? "image/png"
            : imagePath.toLowerCase().endsWith(".webp")
              ? "image/webp"
              : "image/jpeg"

          return new Response(new Uint8Array(buffer), {
            headers: {
              "Content-Type": mimeType,
              "Cache-Control": "public, max-age=31536000",
            },
          })
        } catch {
          // Fallback to original file if processing fails
          return new Response(Bun.file(originalPath))
        }
      },
    },
  },
})
