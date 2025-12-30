import type { Location, ParentLocationMarker } from "@server/app/types"
import { CircleIcon, MapPinIcon } from "lucide-react"
import { useState } from "react"

export const LocationComponent = ({
  location,
  marker,
}: {
  location: Location
  marker?: ParentLocationMarker | null
}) => {
  const [enlarged, setEnlarged] = useState(false)
  const image = `/img/locations/${location.imagePath}`

  return (
    <div
      className={`relative m-2 transition-all duration-300 ${enlarged ? "w-full" : "w-1/2"} ${location.imagePath ? "cursor-pointer" : ""}`}
      onClick={() => location.imagePath && setEnlarged(!enlarged)}
    >
      {marker && (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <CircleIcon
            className="absolute w-8 h-8 shadow-2xl text-green-400"
            style={{
              top: `calc(${marker.y}% - 1rem)`,
              left: `calc(${marker.x}% - 1rem)`,
            }}
          />
        </div>
      )}
      {location.imagePath ? (
        <img className="rounded-2xl w-full" src={image} alt={location.name} />
      ) : (
        <div className="rounded-2xl border-b-gray-700 border-2 w-full aspect-square content-center">
          <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto" />
        </div>
      )}
      <h1 className="absolute bottom-0 left-0 right-0 text-center bg-gray-800 text-white rounded-b-2xl text-sm font-bold">
        {location.name}
      </h1>
    </div>
  )
}
