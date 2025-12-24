import fs from "node:fs"
import * as process from "node:process"
import { createFileRoute } from "@tanstack/react-router"

const imageRootPath = process.env.SAVE_PATH || ""

export const Route = createFileRoute("/img/$")({
  server: {
    handlers: {
      GET: async ({ params, context }) => {
        const fileName = imageRootPath + params._splat
        if (await fs.existsSync(fileName)) {
          return new Response(Bun.file(fileName))
        }
        return new Response("Not found", { status: 404 })
      },
    },
  },
})
