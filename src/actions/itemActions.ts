import fs from "node:fs"
import path from "node:path"
import type {
  Item,
  PaginatedResult,
  ParentLocationMarker,
} from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import z from "zod/v4"
import { diffFields, parseImageDataUrl } from "@/src/lib/itemChanges"
import { itemSchema } from "@/src/lib/itemSchema"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { CategoryRepository } from "@/src/repositories/CategoryRepository"
import { ChangelogRepository } from "@/src/repositories/ChangelogRepository"
import {
  ItemRepository,
  type SearchResult,
} from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const imagePath = process.env.SAVE_PATH || ""

export const searchItems = createServerFn()
  .validator((query: string) => query)
  .handler(async ({ data: query }): Promise<SearchResult[]> => {
    return new ItemRepository().search(query)
  })

export const fetchPaginatedItems = createServerFn()
  .validator((data: { page: number; pageSize?: number }) => data)
  .handler(async ({ data }): Promise<PaginatedResult<Item>> => {
    return new ItemRepository().findPaginated(data.page, data.pageSize ?? 24)
  })

export const fetchItem = createServerFn()
  .validator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    return new ItemRepository().findById(itemId)
  })

/** Item with its full location chain, plus the base URL for QR codes */
export const fetchItemWithLocation = createServerFn()
  .validator(z.object({ itemId: z.number() }))
  .handler(async ({ data: { itemId } }) => {
    const item = await new ItemRepository().findById(itemId)
    if (item?.locationId) {
      item.locationChain = await new LocationRepository().findChainForId(
        item.locationId,
      )
    }
    const baseUrl = process.env.BASE_URL || ""
    return { item, baseUrl }
  })

/** Writes an uploaded base64 image to disk and returns its file name */
async function storeItemImage(dataUrl: string): Promise<string> {
  const { extension, buffer } = parseImageDataUrl(dataUrl)
  const dir = path.join(imagePath, "items")
  await fs.promises.mkdir(dir, { recursive: true })
  const fileName = `${uuidv7()}.${extension}`
  await fs.promises.writeFile(path.join(dir, fileName), buffer)
  return fileName
}

/** Creates a new item or updates an existing one (when `id` is set) */
export const saveItem = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator(itemSchema)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ success: boolean; item?: Item; error?: string }> => {
      const itemRepo = new ItemRepository()
      let beforeItem: Item | undefined

      if (data.id) {
        beforeItem = await itemRepo.findById(data.id)
        if (!beforeItem) {
          return { success: false, error: "Item not found" }
        }
      }

      // A failed image upload must not silently save the item without it
      if (data.image) {
        try {
          data.imagePath = await storeItemImage(data.image)
        } catch (e) {
          console.error(e)
          const message = e instanceof Error ? e.message : String(e)
          return {
            success: false,
            error: `Bild konnte nicht gespeichert werden: ${message}`,
          }
        }
      }

      // Categories come from the curated list; a new one typed by an editor
      // is added to it (and an existing one reused, ignoring case)
      if (data.category?.trim()) {
        data.category = await new CategoryRepository().ensure(data.category)
      }

      const [savedItem] = (await itemRepo.upsert(data)) || []
      if (!savedItem) {
        return { success: true }
      }

      // The base64 image string is not item state, so it is never tracked
      const submittedFields = Object.keys(data).filter((k) => k !== "image")

      if (beforeItem) {
        const changedFields = diffFields(beforeItem, savedItem, submittedFields)
        if (changedFields.length > 0) {
          await new ChangelogRepository().create({
            entityType: "item",
            entityId: savedItem.id,
            changeType: "update",
            userId: context.userId,
            beforeValues: beforeItem as unknown as Record<string, unknown>,
            afterValues: savedItem as unknown as Record<string, unknown>,
            changedFields,
          })
        }
      } else {
        await new ChangelogRepository().create({
          entityType: "item",
          entityId: savedItem.id,
          changeType: "create",
          userId: context.userId,
          beforeValues: null,
          afterValues: savedItem as unknown as Record<string, unknown>,
          changedFields: submittedFields,
        })
      }

      return { success: true, item: savedItem }
    },
  )

/**
 * Sets (or clears, with locationId null) an item's location and records the
 * change in the changelog
 */
async function updateItemLocation(
  itemId: number,
  locationId: number | null,
  parentLocationMarker: ParentLocationMarker | null,
  userId: string | null,
) {
  const itemRepo = new ItemRepository()
  const beforeItem = await itemRepo.findById(itemId)

  if (!beforeItem) {
    return { success: false, message: "Item not found" }
  }

  const [updatedItem] =
    (await itemRepo.upsert({ id: itemId, locationId, parentLocationMarker })) ||
    []

  if (updatedItem) {
    const changedFields = diffFields(beforeItem, updatedItem, [
      "locationId",
      "parentLocationMarker",
    ])
    if (changedFields.length > 0) {
      await new ChangelogRepository().create({
        entityType: "item",
        entityId: itemId,
        changeType: "update",
        userId,
        beforeValues: beforeItem as unknown as Record<string, unknown>,
        afterValues: updatedItem as unknown as Record<string, unknown>,
        changedFields,
      })
    }
  }

  return { success: true }
}

export const setItemLocation = createServerFn()
  .middleware([authGuardMiddleware])
  .validator(
    (data: {
      itemId: number
      locationId: number
      parentLocationMarker: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data, context }) =>
    updateItemLocation(
      data.itemId,
      data.locationId,
      data.parentLocationMarker,
      context.userId,
    ),
  )

export const removeItemLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator((itemId: number) => itemId)
  .handler(async ({ data: itemId, context }) =>
    updateItemLocation(itemId, null, null, context.userId),
  )

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator((itemId: number) => itemId)
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
