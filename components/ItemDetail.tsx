import { LocationComponent } from "@components/LocationComponent"
import { Button } from "@components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import type { Item } from "@server/app/types"
import { Link } from "@tanstack/react-router"
import { MapPinIcon, PencilIcon } from "lucide-react"

export const ItemDetail = ({ item }: { item: Item }) => {
  const imagePath = `/img/items/${item.imagePath}`
  let marker = item.parentLocationMarker

  return (
    <div className="items-center max-w-128 center mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">{item.name}</h1>
      <div>
        {item.imagePath && (
          <img
            className="rounded-2xl w-128 aspect-square mb-4"
            src={imagePath}
            alt={item.name}
          />
        )}
      </div>
      <div className="mb-4">{item.description}</div>
      <div className="font-bold mb-4">ID: {item.id}</div>
      <h3 className="text-xl font-bold p-2 border-2 rounded-2xl bg-gray-600 flex items-center justify-between">
        <span>Wo finde ich es?</span>
        {item?.locationChain && item.locationChain.length > 0 && (
          <Link
            to="/items/$itemId/location/add"
            params={{ itemId: item.id.toString() }}
          >
            <Button variant="ghost" size="sm">
              <PencilIcon className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </h3>
      {item?.locationChain && item.locationChain.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            width: "100%",
            justifyContent: "space-around",
          }}
        >
          {item.locationChain.map((location) => {
            const currentMarker = marker
            marker = location.parentLocationMarker
            return (
              <div key={location.id} className="flex flex-col items-center">
                <LocationComponent location={location} marker={currentMarker} />
              </div>
            )
          })}
        </div>
      ) : (
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>Kein Ort hinterlegt</EmptyTitle>
            <EmptyDescription>
              Diesem Item wurde noch kein Ort zugewiesen.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            to="/items/$itemId/location/add"
            params={{ itemId: item.id.toString() }}
          >
            <Button>Ort hinzufügen</Button>
          </Link>
        </Empty>
      )}
    </div>
  )
}
