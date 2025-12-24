import { ItemDetail } from "@components/ItemDetail"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const ItemIdSchema = z.object({
  itemId: z.number(),
})

const fetchItem = createServerFn()
  .inputValidator(ItemIdSchema)
  .handler(async ({ data: { itemId } }) => {
    const item = await new ItemRepository().findById(itemId)
    if (item?.locationId) {
      item.locationChain = await new LocationRepository().findChainForId(
        item.locationId,
      )
    }
    console.log("Item", item)
    return item
  })

const removeItemLocation = createServerFn()
  .inputValidator(ItemIdSchema)
  .handler(async ({ data: { itemId } }) => {
    await new ItemRepository().upsert({
      id: itemId,
      locationId: null,
      parentLocationMarker: null,
    })
    return { success: true }
  })

export const Route = createFileRoute("/i/$itemId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const itemId = parseInt(params.itemId)
    return fetchItem({ data: { itemId } })
  },
})

function RouteComponent() {
  const item = Route.useLoaderData()
  const router = useRouter()

  const handleDeleteLocation = async () => {
    if (!item) return
    await removeItemLocation({ data: { itemId: item.id } })
    router.invalidate()
  }

  return item && <ItemDetail item={item} onDeleteLocation={handleDeleteLocation} />
}
