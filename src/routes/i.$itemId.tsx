import { ItemDetail } from "@components/ItemDetail"
import { ItemDeleteButton } from "@components/item/ItemDeleteButton"
import { ItemQRCode } from "@components/item/ItemQRCode"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"
import { deleteItem } from "@/src/actions/itemActions"
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
    const baseUrl = process.env.BASE_URL! || ""
    return { item, baseUrl }
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
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.item
          ? `${loaderData.item.name} | MSB Inventar`
          : "Item | MSB Inventar",
      },
    ],
  }),
})

function RouteComponent() {
  const { item, baseUrl } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()

  const handleDeleteLocation = async () => {
    if (!item) return
    await removeItemLocation({ data: { itemId: item.id } })
    router.invalidate()
  }

  const handleDelete = async () => {
    if (!item) return
    const result = await deleteItem({ data: item.id })
    if (result.success) {
      await navigate({ to: "/items" })
    }
  }

  if (!item) return null

  return (
    <div className="max-w-128 mx-auto p-4">
      <div className="flex justify-end mb-4">
        <ItemDeleteButton itemName={item.name} onDelete={handleDelete} />
      </div>
      <ItemDetail item={item} onDeleteLocation={handleDeleteLocation} />
      <ItemQRCode itemId={item.id} itemName={item.name} baseUrl={baseUrl} />
    </div>
  )
}
