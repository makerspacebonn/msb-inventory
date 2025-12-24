import { Button } from "@components/ui/button"
import type { Location, ParentLocationMarker } from "@server/app/types"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { CheckIcon, ChevronLeftIcon, CrosshairIcon } from "lucide-react"
import { type MouseEvent, useRef, useState } from "react"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const fetchRootLocations = createServerFn().handler(async () => {
  return new LocationRepository().findRootLocations()
})

const fetchItem = createServerFn()
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    return new ItemRepository().findById(itemId)
  })

const fetchChildLocations = createServerFn()
  .inputValidator((parentId: number) => parentId)
  .handler(async ({ data: parentId }) => {
    return new LocationRepository().findByParentId(parentId)
  })

const setItemLocation = createServerFn()
  .inputValidator(
    (data: {
      itemId: number
      locationId: number
      parentLocationMarker: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await new ItemRepository().upsert({
      id: data.itemId,
      locationId: data.locationId,
      parentLocationMarker: data.parentLocationMarker,
    })
    return { success: true }
  })

export const Route = createFileRoute("/items/$itemId/location/add")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const [locations, item] = await Promise.all([
      fetchRootLocations(),
      fetchItem({ data: parseInt(params.itemId, 10) }),
    ])
    return { locations, item, itemId: params.itemId }
  },
})

function RouteComponent() {
  const { locations: rootLocations, item, itemId } = Route.useLoaderData()
  const navigate = useNavigate()
  const imageRef = useRef<HTMLImageElement>(null)
  const [currentLocations, setCurrentLocations] =
    useState<Location[]>(rootLocations)
  const [locationPath, setLocationPath] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  )
  const [markerPosition, setMarkerPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const handleLocationClick = async (location: Location) => {
    const children = await fetchChildLocations({ data: location.id })
    if (children.length > 0) {
      setLocationPath([...locationPath, location])
      setCurrentLocations(children)
    }
  }

  const handleSelect = (location: Location) => {
    setSelectedLocation(location)
    setMarkerPosition(null)
  }

  const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setMarkerPosition({ x, y })
  }

  const handleConfirmMarker = async () => {
    if (!selectedLocation) return
    await setItemLocation({
      data: {
        itemId: parseInt(itemId, 10),
        locationId: selectedLocation.id,
        parentLocationMarker: markerPosition
          ? { id: 1, x: markerPosition.x, y: markerPosition.y }
          : null,
      },
    })
    await navigate({ to: "/i/$itemId", params: { itemId } })
  }

  const handleBack = () => {
    if (selectedLocation) {
      setSelectedLocation(null)
      setMarkerPosition(null)
      return
    }
    if (locationPath.length === 1) {
      setCurrentLocations(rootLocations)
      setLocationPath([])
    } else if (locationPath.length > 1) {
      const newPath = locationPath.slice(0, -1)
      const parentLocation = newPath[newPath.length - 1]
      setLocationPath(newPath)
      fetchChildLocations({ data: parentLocation.id }).then(setCurrentLocations)
    }
  }

  const handleBreadcrumbClick = async (index: number) => {
    if (index === -1) {
      // Click on root
      setCurrentLocations(rootLocations)
      setLocationPath([])
    } else {
      const newPath = locationPath.slice(0, index + 1)
      const targetLocation = newPath[index]
      setLocationPath(newPath)
      const children = await fetchChildLocations({ data: targetLocation.id })
      setCurrentLocations(children)
    }
  }

  // Marker selection view
  if (selectedLocation) {
    return (
      <div className="max-w-128 mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Position markieren</h1>
        <p className="text-muted-foreground mb-4">
          Klicke auf das Bild, um die Position des Items in "
          {selectedLocation.name}" zu markieren.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Zurück
          </Button>
        </div>

        <div className="relative inline-block w-full">
          <img
            ref={imageRef}
            src={`/img/locations/${selectedLocation.imagePath}`}
            alt={selectedLocation.name}
            className="w-full rounded-lg cursor-crosshair"
            onClick={handleImageClick}
          />
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
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleConfirmMarker} disabled={!markerPosition}>
            <CheckIcon className="w-4 h-4 mr-1" />
            Speichern
          </Button>
          <Button variant="outline" onClick={handleConfirmMarker}>
            Ohne Markierung speichern
          </Button>
        </div>
      </div>
    )
  }

  // Location selection view
  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Ort auswählen</h1>
      <div className="flex items-center gap-3 mb-6 p-3 bg-muted rounded-lg">
        {item?.imagePath && (
          <img
            src={`/img/items/${item.imagePath}`}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <span className="font-medium">{item?.name}</span>
      </div>

      <div className="flex items-center gap-1 mb-4 flex-wrap">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => handleBreadcrumbClick(-1)}
        >
          Start
        </button>
        {locationPath.map((loc, index) => (
          <span key={loc.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">→</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => handleBreadcrumbClick(index)}
            >
              {loc.name}
            </button>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {currentLocations.map((location) => (
          <div
            key={location.id}
            className="border rounded-lg p-4 flex flex-col items-center gap-2"
          >
            <button
              type="button"
              className="w-full flex flex-col items-center gap-2"
              onClick={() => handleLocationClick(location)}
            >
              {location.imagePath && (
                <img
                  src={`/img/locations/${location.imagePath}`}
                  alt={location.name}
                  className="w-full aspect-square object-cover rounded-lg"
                />
              )}
              <span className="text-lg font-medium">{location.name}</span>
            </button>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => handleSelect(location)}
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Auswählen
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
