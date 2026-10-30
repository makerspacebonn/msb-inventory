import { createFileRoute } from "@tanstack/react-router"
import { json } from "@tanstack/react-start"
import { ItemRepository } from "@/src/repositories/ItemRepository"

export const Route = createFileRoute("/api/items")({
  server: {
    handlers: {
      GET: async () => {
        console.log("GET /api/items")
        return json(await new ItemRepository().findLatest())
      },
    },
  },
})
