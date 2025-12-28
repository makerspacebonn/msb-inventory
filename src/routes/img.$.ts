import fs from "node:fs"
import * as process from "node:process"
import { createFileRoute } from "@tanstack/react-router"
import { ItemRepository } from "@/src/repositories/ItemRepository"

const imageRootPath = process.env.SAVE_PATH || ""

export const Route = createFileRoute("/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const fileName = imageRootPath + params._splat
        if (fs.existsSync(fileName)) {
          return new Response(Bun.file(fileName))
        }
        return new Response("Not found", { status: 404 })
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
