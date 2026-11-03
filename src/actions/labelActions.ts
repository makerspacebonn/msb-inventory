import { createServerFn } from "@tanstack/react-start"
import { inArray } from "drizzle-orm"
import z from "zod/v4"
import { db } from "@/src/db"
import { ItemTable } from "@/src/drizzle/schema"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const idList = z.array(z.number().int().positive()).max(1000)

/**
 * Current names (and paths for locations) of the items and locations on a
 * label sheet, plus the app's address for the QR codes
 */
export const fetchLabelData = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator(z.object({ itemIds: idList, locationIds: idList }))
  .handler(async ({ data }) => {
    const [items, locations] = await Promise.all([
      data.itemIds.length > 0
        ? db
            .select({ id: ItemTable.id, name: ItemTable.name })
            .from(ItemTable)
            .where(inArray(ItemTable.id, data.itemIds))
        : [],
      new LocationRepository().findLabelInfo(data.locationIds),
    ])
    return { baseUrl: process.env.BASE_URL || "", items, locations }
  })

/** A location and all its sublocations, for labelling a whole shelf */
export const fetchLocationSubtree = createServerFn()
  .middleware([authGuardMiddleware])
  .validator(z.number().int().positive())
  .handler(async ({ data: locationId }) =>
    new LocationRepository().findSubtree(locationId),
  )

/** All items in a location and its sublocations, e.g. everything on a shelf */
export const fetchItemsInLocation = createServerFn()
  .middleware([authGuardMiddleware])
  .validator(z.number().int().positive())
  .handler(async ({ data: locationId }) =>
    new LocationRepository().findItemsInSubtree(locationId),
  )
