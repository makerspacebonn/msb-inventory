import fs from "node:fs"
import path from "node:path"
import { createFileRoute } from "@tanstack/react-router"

const SAVE_PATH = process.env.SAVE_PATH || ""
const BACKUPS_DIR = path.join(SAVE_PATH, "backups")

export const Route = createFileRoute("/backup/download/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const filename = params._splat

        // Security: only allow .zip files and prevent directory traversal
        if (!filename || !filename.endsWith(".zip") || filename.includes("..")) {
          return new Response("Invalid filename", { status: 400 })
        }

        const filePath = path.join(BACKUPS_DIR, filename)

        if (!fs.existsSync(filePath)) {
          return new Response("Not found", { status: 404 })
        }

        return new Response(Bun.file(filePath), {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      },
    },
  },
})
