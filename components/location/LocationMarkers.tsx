import { Button } from "@components/ui/button"
import type { Item, Location } from "@server/app/types"
import { CheckIcon, ChevronLeftIcon, CrosshairIcon } from "lucide-react"
import { type MouseEvent, useRef, useState } from "react"

export type MarkerPosition = { x: number; y: number }

export type ExistingMarker = MarkerPosition & { key: string; label: string }

// Collects the markers that already sit on a location image:
// its sublocations and the items stored there
export function collectMarkers(
  childLocations: Location[],
  items: Item[],
): ExistingMarker[] {
  const markers: ExistingMarker[] = []
  for (const location of childLocations) {
    if (location.parentLocationMarker) {
      const { x, y } = location.parentLocationMarker
      markers.push({ key: `l${location.id}`, label: location.name, x, y })
    }
  }
  for (const item of items) {
    if (item.parentLocationMarker) {
      const { x, y } = item.parentLocationMarker
      markers.push({ key: `i${item.id}`, label: item.name, x, y })
    }
  }
  return markers
}

function MarkerDots({ markers }: { markers: ExistingMarker[] }) {
  return markers.map((marker) => (
    <div
      key={marker.key}
      title={marker.label}
      className="absolute w-3 h-3 rounded-full bg-white/60 border border-gray-900/60 pointer-events-none"
      style={{
        left: `${marker.x}%`,
        top: `${marker.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    />
  ))
}

// Location image with the existing markers shown as faint dots
export function LocationImageWithMarkers({
  location,
  markers,
}: {
  location: Location
  markers: ExistingMarker[]
}) {
  return (
    <div className="relative w-full">
      <img
        src={`/img/locations/${location.imagePath}`}
        alt={location.name}
        className="w-full rounded-lg"
      />
      <MarkerDots markers={markers} />
    </div>
  )
}

function LocationMarkerPicker({
  location,
  markers,
  markerPosition,
  onChange,
}: {
  location: Location
  markers: ExistingMarker[]
  markerPosition: MarkerPosition | null
  onChange: (position: MarkerPosition) => void
}) {
  const imageRef = useRef<HTMLImageElement>(null)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    onChange({ x, y })
  }

  return (
    <button
      type="button"
      className="relative inline-block w-full"
      onClick={handleClick}
    >
      <img
        ref={imageRef}
        src={`/img/locations/${location.imagePath}`}
        alt={location.name}
        className="w-full rounded-lg cursor-crosshair"
      />
      <MarkerDots markers={markers} />
      {markerPosition && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${markerPosition.x}%`,
            top: `${markerPosition.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <CrosshairIcon className="w-8 h-8 text-red-500 drop-shadow-lg" />
        </div>
      )}
    </button>
  )
}

// Full-page step: mark the position of something on a location image.
// Only used for locations that have an image.
export function MarkerStep({
  location,
  markers,
  description,
  onConfirm,
  onCancel,
}: {
  location: Location
  markers: ExistingMarker[]
  description: string
  onConfirm: (marker: MarkerPosition | null) => void
  onCancel: () => void
}) {
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(
    null,
  )

  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Position markieren</h1>
      <p className="text-muted-foreground mb-4">{description}</p>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Zurück
        </Button>
      </div>

      <LocationMarkerPicker
        location={location}
        markers={markers}
        markerPosition={markerPosition}
        onChange={setMarkerPosition}
      />

      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => onConfirm(markerPosition)}
          disabled={!markerPosition}
        >
          <CheckIcon className="w-4 h-4 mr-1" />
          Speichern
        </Button>
        <Button variant="outline" onClick={() => onConfirm(null)}>
          Ohne Markierung speichern
        </Button>
      </div>
    </div>
  )
}
