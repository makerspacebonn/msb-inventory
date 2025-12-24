import { LocationComponent } from "@components/LocationComponent"
import type { Item, Location } from "@server/app/types"

export const ItemDetail = ({
  item,
  locations,
}: {
  item: Item
  locations?: Location[] | undefined
}) => {
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
      <h3 className="text-xl font-bold p-2 border-2 rounded-2xl bg-gray-600">
        Wo finde ich es?
      </h3>
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
        {item?.locationChain?.map((location) => {
          const currentMarker = marker
          marker = location.parentLocationMarker
          return (
            <div key={location.id} className="flex flex-col items-center">
              <LocationComponent location={location} marker={currentMarker} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
