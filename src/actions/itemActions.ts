import fs from "node:fs"
import type { Item, PaginatedResult, ParentLocationMarker } from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { ChangelogRepository } from "@/src/repositories/ChangelogRepository"
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
  .handler(async ({ data, context }) => {
    const itemRepo = new ItemRepository()
    const beforeItem = await itemRepo.findById(data.itemId)

    if (!beforeItem) {
      return { success: false, message: "Item not found" }
    }

    // Determine which fields changed
    const changedFields: string[] = []
    if (beforeItem.locationId !== data.locationId) {
      changedFields.push("locationId")
    }
    if (
      JSON.stringify(beforeItem.parentLocationMarker) !==
      JSON.stringify(data.parentLocationMarker)
    ) {
      changedFields.push("parentLocationMarker")
    }

    const [updatedItem] = (await itemRepo.upsert({
      id: data.itemId,
      locationId: data.locationId,
      parentLocationMarker: data.parentLocationMarker,
    })) || []

    // Log to changelog if there were changes
    if (changedFields.length > 0 && updatedItem) {
      await new ChangelogRepository().create({
        entityType: "item",
        entityId: data.itemId,
        changeType: "update",
        userId: context.userId,
        beforeValues: beforeItem as unknown as Record<string, unknown>,
        afterValues: updatedItem as unknown as Record<string, unknown>,
        changedFields,
      })
    }

    return { success: true }
  })

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId, context }) => {
    const itemRepo = new ItemRepository()
    const item = await itemRepo.findById(itemId)

    if (!item) {
      return { success: false, message: "Item not found" }
    }

    // Store full item state before deletion for changelog
    const beforeValues = { ...item } as unknown as Record<string, unknown>

    // Delete the item first
    const deleted = await itemRepo.delete(itemId)

    if (deleted) {
      // Log to changelog
      await new ChangelogRepository().create({
        entityType: "item",
        entityId: itemId,
        changeType: "delete",
        userId: context.userId,
        beforeValues,
        afterValues: null,
        changedFields: Object.keys(beforeValues),
      })

      // Handle image cleanup
      if (item.imagePath) {
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
    }

    return { success: deleted }
  })
