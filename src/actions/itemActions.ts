import fs from "node:fs"
import type { Item, PaginatedResult, ParentLocationMarker } from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import {
  ItemRepository,
  type SearchResult,
} from "@/src/repositories/ItemRepository"

const imagePath = process.env.SAVE_PATH || ""

export const searchItems = createServerFn()
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }): Promise<SearchResult[]> => {
    return new ItemRepository().search(query)
  })

export const fetchPaginatedItems = createServerFn()
  .inputValidator((data: { page: number; pageSize?: number }) => data)
  .handler(async ({ data }): Promise<PaginatedResult<Item>> => {
    return new ItemRepository().findPaginated(data.page, data.pageSize ?? 24)
  })

export const fetchItem = createServerFn()
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    return new ItemRepository().findById(itemId)
  })

export const setItemLocation = createServerFn()
  .middleware([authGuardMiddleware])
  .inputValidator(
    (data: {
      itemId: number
      locationId: number
      parentLocationMarker: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await new ItemRepository().upsert({
      id: data.itemId,
      locationId: data.locationId,
      parentLocationMarker: data.parentLocationMarker,
    })
    return { success: true }
  })

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    const itemRepo = new ItemRepository()
    const item = await itemRepo.findById(itemId)

    if (!item) {
      return { success: false, message: "Item not found" }
    }

    // Delete the item first
    const deleted = await itemRepo.delete(itemId)

    if (deleted && item.imagePath) {
      // Check if any other items use this image
      const usageCount = await itemRepo.countByImagePath(item.imagePath)

      if (usageCount === 0) {
        // Delete the image file
        const fullPath = `${imagePath}items/${item.imagePath}`
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      }
    }

    return { success: deleted }
  })
