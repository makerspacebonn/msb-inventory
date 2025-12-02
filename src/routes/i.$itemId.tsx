import { ItemDetail } from "@components/ItemDetail"
import { createFileRoute } from "@tanstack/react-router"
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

export const Route = createFileRoute("/i/$itemId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const itemId = parseInt(params.itemId)
    return fetchItem({ data: { itemId } })
  },
})

function RouteComponent() {
  const item = Route.useLoaderData()
  return item && <ItemDetail item={item} />
}
