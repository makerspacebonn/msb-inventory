import type { ParentLocationMarker } from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import { ItemRepository } from "@/src/repositories/ItemRepository"

export const fetchItem = createServerFn()
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    return new ItemRepository().findById(itemId)
  })

export const setItemLocation = createServerFn()
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