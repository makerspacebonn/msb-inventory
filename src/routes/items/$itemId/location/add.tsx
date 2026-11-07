import { ItemLocationPicker } from "@components/location/ItemLocationPicker"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { fetchItem, setItemLocation } from "@/src/actions/itemActions"
import { fetchLocationView } from "@/src/actions/locationActions"
import { requireLogin } from "@/src/lib/access"

type LocationPickerSearch = {
  at?: number // location currently shown in the picker
}

export const Route = createFileRoute("/items/$itemId/location/add")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LocationPickerSearch => {
    return {
      at: search.at ? Number(search.at) : undefined,
    }
  },
  beforeLoad: ({ context }) => requireLogin(context),
  loaderDeps: ({ search: { at } }) => ({ at }),
  loader: async ({ params, deps: { at } }) => {
    const item = await fetchItem({ data: parseInt(params.itemId, 10) })
    // Without an explicit position, start at the item's current location
    const view = await fetchLocationView({
      data: at ?? item?.locationId ?? undefined,
    })
    return { item, itemId: params.itemId, view }
  },
})

/** Changes the location of an existing item; the browsing is in the URL */
function RouteComponent() {
  const { item, itemId, view } = Route.useLoaderData()
  const navigate = useNavigate()
  const toItem = () => navigate({ to: "/i/$itemId", params: { itemId } })

  return (
    <ItemLocationPicker
      view={view}
      item={{
        id: item?.id,
        name: item?.name ?? "",
        imageSrc: item?.imagePath ? `/img/items/${item.imagePath}` : undefined,
      }}
      onNavigate={(locationId) =>
        navigate({
          to: "/items/$itemId/location/add",
          params: { itemId },
          search: locationId === undefined ? {} : { at: locationId },
        })
      }
      onChoose={async (location, marker) => {
        await setItemLocation({
          data: {
            itemId: parseInt(itemId, 10),
            locationId: location.id,
            parentLocationMarker: marker
              ? { id: 1, x: marker.x, y: marker.y }
              : null,
          },
        })
        await toItem()
      }}
      onCancel={toItem}
    />
  )
}
