import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import type { Location, ParentLocationMarker } from "@server/app/types"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import fs from "fs"
import {
  CheckIcon,
  ChevronLeftIcon,
  CrosshairIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react"
import { type MouseEvent, useRef, useState } from "react"
import { v7 as uuidv7 } from "uuid"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const fetchRootLocations = createServerFn().handler(async () => {
  return new LocationRepository().findRootLocations()
})

const fetchLocationChain = createServerFn()
  .inputValidator((locationId: number) => locationId)
  .handler(async ({ data: locationId }) => {
    const chain = await new LocationRepository().findChainForId(locationId)
    // Chain is returned as [current, parent, grandparent, ...root]
    // We need it as [root, ..., grandparent, parent] (without current)
    return chain.slice(1).reverse()
  })

const fetchItem = createServerFn()
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    return new ItemRepository().findById(itemId)
  })

const fetchChildLocations = createServerFn()
  .inputValidator((parentId: number | undefined) => parentId)
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

function decodeBase64Image(dataString: string) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (matches?.length !== 3) {
    throw new Error("Invalid input string")
  }
  return {
    fileType: matches[1],
    fileBuffer: Buffer.from(matches[2], "base64"),
  }
}

const createLocation = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string
      image?: string
      parentId: number | null
      parentLocationMarker: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data }) => {
    let imagePath: string | undefined
    if (data.image) {
      const savePath = `${process.env.SAVE_PATH}locations/`
      const { fileType, fileBuffer } = decodeBase64Image(data.image)
      const fileName = uuidv7()
      const fileExtension = fileType?.split("/")[1]
      const filePath = `${savePath}${fileName}.${fileExtension}`
      const fileStream = fs.createWriteStream(filePath)
      fileStream.write(fileBuffer)
      fileStream.end()
      imagePath = `${fileName}.${fileExtension}`
    }
    const location = await new LocationRepository().create({
      name: data.name,
      parentId: data.parentId,
      parentLocationMarker: data.parentLocationMarker,
      imagePath,
    })
    return { success: true, location }
  })

export const Route = createFileRoute("/items/$itemId/location/add")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const [locations, item] = await Promise.all([
      fetchRootLocations(),
      fetchItem({ data: parseInt(params.itemId, 10) }),
    ])
    // If item has a location, fetch the chain and siblings
    let initialPath: Location[] = []
    let initialLocations = locations
    if (item?.locationId) {
      const chain = await fetchLocationChain({ data: item.locationId })
      initialPath = chain
      // Fetch siblings of the current location (children of parent)
      if (chain.length > 0) {
        const parentId = chain[chain.length - 1].id
        initialLocations = await fetchChildLocations({ data: parentId })
      }
    }
    return {
      locations,
      item,
      itemId: params.itemId,
      initialPath,
      initialLocations,
    }
  },
})

function RouteComponent() {
  const {
    locations: rootLocations,
    item,
    itemId,
    initialPath,
    initialLocations,
  } = Route.useLoaderData()
  const navigate = useNavigate()
  const imageRef = useRef<HTMLImageElement>(null)
  const [currentLocations, setCurrentLocations] =
    useState<Location[]>(initialLocations)
  const [locationPath, setLocationPath] = useState<Location[]>(initialPath)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  )
  const [markerPosition, setMarkerPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  // State for creating new location
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)
  const [newLocationName, setNewLocationName] = useState("")
  const [newLocationImage, setNewLocationImage] = useState("")
  const [pendingNewLocation, setPendingNewLocation] = useState<{
    name: string
    image: string
  } | null>(null)

  const handleLocationClick = async (location: Location) => {
    const children = await fetchChildLocations({ data: location.id })
    setLocationPath([...locationPath, location])
    setCurrentLocations(children)
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

  const handleStartCreateLocation = () => {
    setIsCreatingLocation(true)
    setNewLocationName("")
    setNewLocationImage("")
  }

  const handleCancelCreateLocation = () => {
    setIsCreatingLocation(false)
    setNewLocationName("")
    setNewLocationImage("")
    setPendingNewLocation(null)
  }

  const handleProceedToMarker = () => {
    if (!newLocationName.trim()) return
    setPendingNewLocation({ name: newLocationName, image: newLocationImage })
    setMarkerPosition(null)
  }

  const handleConfirmNewLocation = async () => {
    // Use pendingNewLocation if set, otherwise use form values directly (root level)
    const name = pendingNewLocation?.name ?? newLocationName
    const image = pendingNewLocation?.image ?? newLocationImage
    if (!name.trim()) return
    const parentLocation =
      locationPath.length > 0 ? locationPath[locationPath.length - 1] : null
    const result = await createLocation({
      data: {
        name,
        image: image || undefined,
        parentId: parentLocation?.id ?? null,
        parentLocationMarker: markerPosition
          ? { id: 1, x: markerPosition.x, y: markerPosition.y }
          : null,
      },
    })
    if (result.success && result.location) {
      // Add new location to current list and reset state
      setCurrentLocations([...currentLocations, result.location])
      setIsCreatingLocation(false)
      setNewLocationName("")
      setNewLocationImage("")
      setPendingNewLocation(null)
      setMarkerPosition(null)
    }
  }

  // View: Place marker on parent for new location
  if (pendingNewLocation && locationPath.length > 0) {
    const parentLocation = locationPath[locationPath.length - 1]
    return (
      <div className="max-w-128 mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Position markieren</h1>
        <p className="text-muted-foreground mb-4">
          Klicke auf das Bild, um die Position von "{pendingNewLocation.name}"
          in "{parentLocation.name}" zu markieren.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelCreateLocation}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Abbrechen
          </Button>
        </div>

        {parentLocation.imagePath ? (
          <div className="relative inline-block w-full">
            <img
              ref={imageRef}
              src={`/img/locations/${parentLocation.imagePath}`}
              alt={parentLocation.name}
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
        ) : (
          <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
            <MapPinIcon className="w-24 h-24 text-gray-400" />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {parentLocation.imagePath ? (
            <>
              <Button
                onClick={handleConfirmNewLocation}
                disabled={!markerPosition}
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Speichern
              </Button>
              <Button variant="outline" onClick={handleConfirmNewLocation}>
                Ohne Markierung speichern
              </Button>
            </>
          ) : (
            <Button onClick={handleConfirmNewLocation}>
              <CheckIcon className="w-4 h-4 mr-1" />
              Speichern
            </Button>
          )}
        </div>
      </div>
    )
  }

  // View: Create new location form
  if (isCreatingLocation) {
    const parentLocation =
      locationPath.length > 0 ? locationPath[locationPath.length - 1] : null
    return (
      <div className="max-w-128 mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Neue Location erstellen</h1>
        {parentLocation && (
          <p className="text-muted-foreground mb-4">
            In: {locationPath.map((loc) => loc.name).join(" → ")}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelCreateLocation}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Abbrechen
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="locationName"
              className="block text-sm font-medium mb-1"
            >
              Name
            </label>
            <Input
              id="locationName"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="Name der Location"
            />
          </div>

          <div>
            <MyCropper onChange={(image) => setNewLocationImage(image)} />
          </div>

          <div className="flex gap-2">
            {parentLocation ? (
              <Button
                onClick={handleProceedToMarker}
                disabled={!newLocationName.trim()}
              >
                Weiter zur Markierung
              </Button>
            ) : (
              <Button
                onClick={handleConfirmNewLocation}
                disabled={!newLocationName.trim()}
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Erstellen
              </Button>
            )}
          </div>
        </div>
      </div>
    )
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

        {selectedLocation.imagePath ? (
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
        ) : (
          <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
            <MapPinIcon className="w-24 h-24 text-gray-400" />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {selectedLocation.imagePath ? (
            <>
              <Button onClick={handleConfirmMarker} disabled={!markerPosition}>
                <CheckIcon className="w-4 h-4 mr-1" />
                Speichern
              </Button>
              <Button variant="outline" onClick={handleConfirmMarker}>
                Ohne Markierung speichern
              </Button>
            </>
          ) : (
            <Button onClick={handleConfirmMarker}>
              <CheckIcon className="w-4 h-4 mr-1" />
              Speichern
            </Button>
          )}
        </div>
      </div>
    )
  }

  const handleCancel = () => {
    navigate({ to: "/i/$itemId", params: { itemId } })
  }

  // Location selection view
  return (
    <div className="max-w-128 mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Abbrechen
        </Button>
      </div>
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
              {location.imagePath ? (
                <img
                  src={`/img/locations/${location.imagePath}`}
                  alt={location.name}
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
                  <MapPinIcon className="w-12 h-12 text-gray-400" />
                </div>
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
        <button
          type="button"
          className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          onClick={handleStartCreateLocation}
        >
          <div className="w-full aspect-square flex items-center justify-center">
            <PlusIcon className="w-12 h-12" />
          </div>
          <span className="text-lg font-medium">Neue Location</span>
        </button>
      </div>
    </div>
  )
}
