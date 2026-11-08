import type {
  Item,
  PaginatedResult,
  ParentLocationMarker,
} from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import z from "zod/v4"
import { diffFields } from "@/src/lib/changelogUtils"
import { AppError, errorMessage } from "@/src/lib/errors"
import { storeImage } from "@/src/lib/imageUtils"
import { picturePaths, resolvePictures } from "@/src/lib/itemPictures"
import { itemSchema } from "@/src/lib/itemSchema"
import { isCrawler } from "@/src/lib/viewCounting"
import {
  authGuardMiddleware,
  authMiddleware,
} from "@/src/middleware/authMiddleware"
import { CategoryRepository } from "@/src/repositories/CategoryRepository"
import { recordChange } from "@/src/repositories/ChangelogRepository"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"
import { recordItemView } from "@/src/repositories/StatsRepository"

/**
 * Searches the inventory, for the results page and the suggestions while
 * typing. Not counted here: see countSearch
 */
export const searchItems = createServerFn()
  .validator((query: string) => query)
  .handler(async ({ data: query }): Promise<Item[]> => {
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

/**
 * Counts a view of an item's page, sent by the page once a browser shows it.
 * Loading the page doesn't count, as crawlers load pages without showing
 * them; known crawlers are ignored here too (STATS-001)
 */
export const countItemView = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ itemId: z.number().int().positive() }))
  .handler(async ({ data: { itemId }, context }) => {
    const { getRequest, getRequestIP } = await import(
      "@tanstack/react-start/server"
    )
    const userAgent = getRequest().headers.get("user-agent")
    if (isCrawler(userAgent)) return
    if (!(await new ItemRepository().findById(itemId))) return
    await recordItemView(itemId, {
      userId: context.userId,
      // Behind the reverse proxy, the visitor's address is in X-Forwarded-For
      ip: getRequestIP({ xForwardedFor: true }),
      userAgent,
    })
  })

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
          return { success: false, error: "Item nicht gefunden" }
        }
      }

      const { pictures, ...fields } = data
      const item: Partial<Item> = fields

      if (
        item.locationId &&
        !(await new LocationRepository().findById(item.locationId))
      ) {
        throw new AppError("NOT_FOUND", "Location nicht gefunden")
      }

      // A failed image upload must not silently save the item without it
      if (pictures) {
        try {
          Object.assign(
            item,
            await resolvePictures(
              pictures,
              beforeItem ? picturePaths(beforeItem) : [],
              (dataUrl) => storeImage(dataUrl, "items"),
            ),
          )
        } catch (e) {
          if (e instanceof AppError) throw e
          console.error(e)
          return {
            success: false,
            error: `Bild konnte nicht gespeichert werden: ${errorMessage(e, "Fehler beim Speichern der Datei")}`,
          }
        }
      }

      // Categories come from the curated list; a new one typed by an editor
      // is added to it (and an existing one reused, ignoring case)
      if (item.category?.trim()) {
        item.category = await new CategoryRepository().ensure(item.category)
      }

      const [savedItem] = (await itemRepo.upsert(item)) || []
      if (!savedItem) {
        return { success: true }
      }

      // The pictures are tracked as the columns they were saved to
      const submittedFields = Object.keys(item)

      if (beforeItem) {
        const changedFields = diffFields(beforeItem, savedItem, submittedFields)
        if (changedFields.length > 0) {
          await recordChange({
            entityType: "item",
            entityId: savedItem.id,
            changeType: "update",
            userId: context.userId,
            before: beforeItem,
            after: savedItem,
            changedFields,
          })
        }
      } else {
        await recordChange({
          entityType: "item",
          entityId: savedItem.id,
          changeType: "create",
          userId: context.userId,
          before: null,
          after: savedItem,
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
      await recordChange({
        entityType: "item",
        entityId: itemId,
        changeType: "update",
        userId,
        before: beforeItem,
        after: updatedItem,
        changedFields,
      })
    }
  }

  return { success: true }
}

export const setItemLocation = createServerFn({ method: "POST" })
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

    // Delete the item first
    const deleted = await itemRepo.delete(itemId)

    if (deleted) {
      // Log to changelog
      await recordChange({
        entityType: "item",
        entityId: itemId,
        changeType: "delete",
        userId: context.userId,
        before: item,
        after: null,
        changedFields: Object.keys(item),
      })
      // The image file is kept, so undoing the deletion restores it too
    }

    return { success: deleted }
  })
