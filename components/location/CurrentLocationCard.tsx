import type { Location } from "@server/app/types"
import { MapPinIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import {
  type ExistingMarker,
  LocationImageWithMarkers,
} from "./LocationMarkers"

type CurrentLocationCardProps = {
  location: Location
  markers: ExistingMarker[]
  actions?: ReactNode // small buttons next to the name
  children?: ReactNode // main action below, e.g. "Hier ablegen"
}

// The location the user is currently in. Tapping the image enlarges it
// and shows where sublocations and items are marked.
export function CurrentLocationCard({
  location,
  markers,
  actions,
  children,
}: CurrentLocationCardProps) {
  const [enlarged, setEnlarged] = useState(false)

  return (
    <div className="mb-6 p-4 border-2 rounded-lg space-y-4">
      <div className="flex items-center gap-4">
        {location.imagePath ? (
          <button
            type="button"
            className="flex-shrink-0"
            onClick={() => setEnlarged(!enlarged)}
            aria-label={enlarged ? "Bild verkleinern" : "Bild vergrößern"}
          >
            <img
              src={`/img/locations/${location.imagePath}`}
              alt={location.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
          </button>
        ) : (
          <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
            <MapPinIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">{location.name}</h2>
          {location.description && (
            <p className="text-muted-foreground">{location.description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {enlarged && location.imagePath && (
        <button
          type="button"
          className="block w-full"
          onClick={() => setEnlarged(false)}
        >
          <LocationImageWithMarkers location={location} markers={markers} />
        </button>
      )}

      {children}
    </div>
  )
}
