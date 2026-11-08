import { ItemDetail } from "@components/ItemDetail"
import { ItemDeleteButton } from "@components/item/ItemDeleteButton"
import { LabelSheetToggle } from "@components/labels/LabelSheetButtons"
import { QRCodeLabel } from "@components/QRCodeLabel"
import { Button } from "@components/ui/button"
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { PencilIcon } from "lucide-react"
import { useEffect } from "react"
import {
  countItemView,
  deleteItem,
  fetchItemWithLocation,
  removeItemLocation,
} from "@/src/actions/itemActions"
import { useAuth } from "@/src/context/AuthContext"

export const Route = createFileRoute("/i/$itemId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const itemId = parseInt(params.itemId, 10)
    return fetchItemWithLocation({ data: { itemId } })
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
  const { isLoggedIn } = useAuth()

  // A view counts once a browser shows the page, not when it's loaded
  const itemId = item?.id
  useEffect(() => {
    if (itemId) void countItemView({ data: { itemId } })
  }, [itemId])

  const handleDeleteLocation = async () => {
    if (!item) return
    await removeItemLocation({ data: item.id })
    router.invalidate()
  }

  const handleDelete = async () => {
    if (!item) return
    const result = await deleteItem({ data: item.id })
    if (result.success) {
      await navigate({ to: "/items" })
    }
  }

  if (!item) {
    return (
      <div className="max-w-128 mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Item nicht gefunden</h1>
        <p className="text-muted-foreground mb-4">
          Dieses Item gibt es nicht oder es wurde gelöscht.
        </p>
        <Button asChild variant="outline">
          <Link to="/items">Zu allen Items</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-128 mx-auto p-4">
      {isLoggedIn && (
        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <LabelSheetToggle kind="item" id={item.id} name={item.name} />
          <Button asChild variant="outline">
            <Link to="/items/add" search={{ itemId: item.id }}>
              <PencilIcon className="w-4 h-4 mr-2" />
              Bearbeiten
            </Link>
          </Button>
          <ItemDeleteButton itemName={item.name} onDelete={handleDelete} />
        </div>
      )}
      <ItemDetail
        item={item}
        onDeleteLocation={handleDeleteLocation}
        canEdit={isLoggedIn}
      />
      <QRCodeLabel
        url={`${baseUrl}/i/${item.id}`}
        name={item.name}
        caption={`ID: ${item.id}`}
        printedId={item.id.toString()}
        fileName={`qr-${item.id}-${item.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
      />
    </div>
  )
}
