import type { Location, ParentLocationMarker } from "@server/app/types"
import { Link } from "@tanstack/react-router"
import {
  ChevronRightIcon,
  CircleIcon,
  MapPinIcon,
  Maximize2Icon,
  Minimize2Icon,
} from "lucide-react"
import { useState } from "react"

// One step of an item's location path: the photo zooms, the name below it
// opens the location page. Two separate controls, so it's clear which does what.
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
      className={`m-2 transition-all duration-300 ${enlarged ? "w-full" : "w-1/2"}`}
    >
      {location.imagePath ? (
        <button
          type="button"
          className="group relative block w-full cursor-zoom-in rounded-2xl aria-pressed:cursor-zoom-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`Bild von ${location.name} ${enlarged ? "verkleinern" : "vergrößern"}`}
          aria-pressed={enlarged}
          onClick={() => setEnlarged(!enlarged)}
        >
          <img className="w-full rounded-2xl" src={image} alt="" />
          {marker && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <CircleIcon
                className="absolute h-8 w-8 text-green-400 shadow-2xl"
                aria-hidden="true"
                style={{
                  top: `calc(${marker.y}% - 1rem)`,
                  left: `calc(${marker.x}% - 1rem)`,
                }}
              />
            </div>
          )}
          <span
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition-colors group-hover:bg-black/80"
            aria-hidden="true"
          >
            {enlarged ? (
              <Minimize2Icon className="h-4 w-4" />
            ) : (
              <Maximize2Icon className="h-4 w-4" />
            )}
          </span>
        </button>
      ) : (
        <div className="aspect-square w-full content-center rounded-2xl border-2 border-b-gray-700">
          <MapPinIcon
            className="mx-auto h-16 w-16 text-gray-400"
            aria-hidden="true"
          />
        </div>
      )}
      <Link
        to="/locations"
        search={{ id: location.id }}
        className="mt-1 flex items-center justify-center gap-1 rounded-md px-2 py-1 text-sm font-bold hover:bg-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="truncate">{location.name}</span>
        <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>
    </div>
  )
}
