import fs from "node:fs"
import path from "node:path"
import * as process from "node:process"
import { createFileRoute } from "@tanstack/react-router"
import sharp from "sharp"
import { ItemRepository } from "@/src/repositories/ItemRepository"

const imageRootPath = process.env.SAVE_PATH || ""
const cacheDir = path.join(imageRootPath, ".cache")

const SIZE_CONFIG = {
  default: { maxSize: 1000, quality: 80 },
  s: { maxSize: 200, quality: 60 },
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
  if ((metadata.width && metadata.width > maxSize) || (metadata.height && metadata.height > maxSize)) {
    resizedImage = image.resize(maxSize, maxSize, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  // Apply quality settings based on format
  const format = metadata.format
  if (format === "jpeg" || format === "jpg") {
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

        const originalPath = path.join(imageRootPath, imagePath)
        if (!fs.existsSync(originalPath)) {
          return new Response("Not found", { status: 404 })
        }

        // Parse size parameter from URL
        const url = new URL(request.url)
        const sizeParam = url.searchParams.get("size")
        const config = sizeParam === "s" ? SIZE_CONFIG.s : SIZE_CONFIG.default
        const cacheSubDir = sizeParam === "s" ? "small" : "default"

        const cachePath = path.join(cacheDir, cacheSubDir, imagePath)

        try {
          const buffer = await getResizedImage(originalPath, cachePath, config.maxSize, config.quality)
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
      DELETE: async ({ params }) => {
        const imagePath = params._splat
        if (!imagePath) {
          return new Response("Image path required", { status: 400 })
        }

        // Extract just the filename from path like "items/abc.jpg"
        const fileName = imagePath.split("/").pop()
        if (!fileName) {
          return new Response("Invalid image path", { status: 400 })
        }

        // Check if any items are using this image
        const itemRepo = new ItemRepository()
        const usageCount = await itemRepo.countByImagePath(fileName)

        if (usageCount > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Image is still used by ${usageCount} item(s)`,
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          )
        }

        // Delete the file
        const fullPath = imageRootPath + imagePath
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
          return new Response(
            JSON.stringify({ success: true }),
            { headers: { "Content-Type": "application/json" } },
          )
        }

        return new Response("Image not found", { status: 404 })
      },
    },
  },
})
