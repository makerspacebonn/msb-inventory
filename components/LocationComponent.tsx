import type { Location, ParentLocationMarker } from "@server/app/types"
import { Circle, CircleIcon } from "lucide-react"

export const LocationComponent = ({
  location,
  marker,
}: {
  location: Location
  marker?: ParentLocationMarker | null
}) => {
  const image = `/container/img/locations/${location.imagePath}`
  return (
    <div className="relative w-1/2 m-2">
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
      <img className="rounded-2xl" src={image} alt={location.name} />
      <h1 className="absolute bottom-0 left-0 right-0 text-center bg-gray-800 text-white rounded-b-2xl text-sm font-bold">
        {location.name}
      </h1>
    </div>
  )
}
