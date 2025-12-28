import { AdditionalInfo } from "@components/item/AdditionalInfo"
import { ItemLocationDeleteButton } from "@components/item/ItemLocationDeleteButton"
import { Tags } from "@components/item/Tags"
import { LocationComponent } from "@components/LocationComponent"
import { LocationEmpty } from "@components/location/LocationEmpty"
import { Button } from "@components/ui/button"
import type { Item } from "@server/app/types"
import { Link } from "@tanstack/react-router"
import { PencilIcon } from "lucide-react"

export type ItemDetailProps = {
  item: Item
  onDeleteLocation?: () => void
}

export const ItemDetail = ({ item, onDeleteLocation }: ItemDetailProps) => {
  const imagePath = `/img/items/${item.imagePath}`
  let marker = item.parentLocationMarker

  return (
    <div className="items-center max-w-128 center mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">{item.name} </h1>
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
      <AdditionalInfo item={item} />
      <Tags tags={item.tags} />
      <h3 className="text-xl font-bold p-2 border-2 rounded-2xl bg-green-900 flex items-center justify-between">
        <span>Wo finde ich es?</span>{" "}
        <div className="flex items-center gap-1">
          <Link
            to="/items/$itemId/location/add"
            params={{ itemId: item.id.toString() }}
          >
            <Button variant="ghost" size="sm">
              <PencilIcon className="w-4 h-4" />
            </Button>
          </Link>
          <ItemLocationDeleteButton
            item={item}
            onDeleteLocation={onDeleteLocation}
          />
        </div>
      </h3>

      {item?.locationChain && item.locationChain.length > 0 ? (
        <div className="flex flex-col items-center w-full">
          {item.locationChain.map((location) => {
            const currentMarker = marker
            marker = location.parentLocationMarker
            return (
              <div
                key={location.id}
                className="flex flex-col items-center w-full"
              >
                <LocationComponent location={location} marker={currentMarker} />
              </div>
            )
          })}
        </div>
      ) : (
        <LocationEmpty itemId={item.id} />
      )}
    </div>
  )
}
