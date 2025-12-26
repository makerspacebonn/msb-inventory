import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import type { Item, Location } from "@server/app/types"
import { createFileRoute, Link } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import fs from "fs"
import {
  ChevronLeftIcon,
  ImagePlusIcon,
  MapPinIcon,
  PackageIcon,
} from "lucide-react"
import { useState } from "react"
import { v7 as uuidv7 } from "uuid"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const fetchRootLocations = createServerFn().handler(async () => {
  return new LocationRepository().findRootLocations()
})

const fetchChildLocations = createServerFn()
  .inputValidator((parentId: number) => parentId)
  .handler(async ({ data: parentId }) => {
    return new LocationRepository().findByParentId(parentId)
  })

const fetchItemsByLocation = createServerFn()
  .inputValidator((locationId: number) => locationId)
  .handler(async ({ data: locationId }) => {
    return new ItemRepository().findByLocationId(locationId)
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

const updateLocationImage = createServerFn({ method: "POST" })
  .inputValidator((data: { locationId: number; image: string }) => data)
  .handler(async ({ data }) => {
    const savePath = `${process.env.SAVE_PATH}locations/`
    const { fileType, fileBuffer } = decodeBase64Image(data.image)
    const fileName = uuidv7()
    const fileExtension = fileType?.split("/")[1]
    const filePath = `${savePath}${fileName}.${fileExtension}`
    const fileStream = fs.createWriteStream(filePath)
    fileStream.write(fileBuffer)
    fileStream.end()
    const imagePath = `${fileName}.${fileExtension}`

    const updatedLocation = await new LocationRepository().update(
      data.locationId,
      { imagePath },
    )
    return { success: true, location: updatedLocation }
  })

export const Route = createFileRoute("/locations")({
  component: RouteComponent,
  loader: async () => {
    const locations = await fetchRootLocations()
    return { locations }
  },
})

function RouteComponent() {
  const { locations: rootLocations } = Route.useLoaderData()
  const [currentLocations, setCurrentLocations] =
    useState<Location[]>(rootLocations)
  const [locationPath, setLocationPath] = useState<Location[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [newImage, setNewImage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleLocationClick = async (location: Location) => {
    const [children, locationItems] = await Promise.all([
      fetchChildLocations({ data: location.id }),
      fetchItemsByLocation({ data: location.id }),
    ])
    setLocationPath([...locationPath, location])
    setCurrentLocations(children)
    setItems(locationItems)
  }

  const handleBack = () => {
    if (locationPath.length === 1) {
      setCurrentLocations(rootLocations)
      setLocationPath([])
      setItems([])
    } else if (locationPath.length > 1) {
      const newPath = locationPath.slice(0, -1)
      const parentLocation = newPath[newPath.length - 1]
      setLocationPath(newPath)
      Promise.all([
        fetchChildLocations({ data: parentLocation.id }),
        fetchItemsByLocation({ data: parentLocation.id }),
      ]).then(([children, locationItems]) => {
        setCurrentLocations(children)
        setItems(locationItems)
      })
    }
  }

  const handleBreadcrumbClick = async (index: number) => {
    if (index === -1) {
      setCurrentLocations(rootLocations)
      setLocationPath([])
      setItems([])
    } else {
      const newPath = locationPath.slice(0, index + 1)
      const targetLocation = newPath[index]
      setLocationPath(newPath)
      const [children, locationItems] = await Promise.all([
        fetchChildLocations({ data: targetLocation.id }),
        fetchItemsByLocation({ data: targetLocation.id }),
      ])
      setCurrentLocations(children)
      setItems(locationItems)
    }
  }

  const currentLocation =
    locationPath.length > 0 ? locationPath[locationPath.length - 1] : null

  const handleSaveImage = async () => {
    if (!currentLocation || !newImage) return
    const result = await updateLocationImage({
      data: { locationId: currentLocation.id, image: newImage },
    })
    if (result.success && result.location) {
      // Update the location in the path
      const updatedPath = locationPath.map((loc) =>
        loc.id === currentLocation.id ? result.location : loc,
      ) as Location[]
      setLocationPath(updatedPath)
      setNewImage("")
      setIsDialogOpen(false)
    }
  }

  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Locations</h1>

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {locationPath.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Zurück
          </Button>
        )}
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

      {/* Current location header */}
      {currentLocation && (
        <div className="mb-6 p-4 border-2 rounded-lg">
          <div className="flex items-center gap-4">
            {currentLocation.imagePath ? (
              <img
                src={`/img/locations/${currentLocation.imagePath}`}
                alt={currentLocation.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
                <MapPinIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentLocation.name}</h2>
              {currentLocation.description && (
                <p className="text-muted-foreground">
                  {currentLocation.description}
                </p>
              )}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ImagePlusIcon className="w-4 h-4 mr-1" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bild hinzufügen</DialogTitle>
                  <DialogDescription>
                    Füge ein Bild zu "{currentLocation.name}" hinzu.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <MyCropper onChange={(image) => setNewImage(image)} />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Abbrechen</Button>
                  </DialogClose>
                  <Button onClick={handleSaveImage} disabled={!newImage}>
                    Speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Child locations grid */}
      {currentLocations.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-3">
            {currentLocation ? "Unterorte" : "Alle Locations"}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {currentLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                className="border rounded-lg p-3 flex flex-col items-center gap-2 hover:bg-muted transition-colors"
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
                <span className="text-sm font-medium text-center">
                  {location.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Items at current location */}
      {currentLocation && (
        <>
          <h3 className="text-lg font-semibold mb-3">
            Items an diesem Ort ({items.length})
          </h3>
          {items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {items.map((item) => (
                <Link
                  key={item.id}
                  to="/i/$itemId"
                  params={{ itemId: item.id.toString() }}
                  className="border rounded-lg p-3 flex flex-col items-center gap-2 hover:bg-muted transition-colors"
                >
                  {item.imagePath ? (
                    <img
                      src={`/img/items/${item.imagePath}`}
                      alt={item.name}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
                      <PackageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-center">
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PackageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Keine Items an diesem Ort</p>
            </div>
          )}
        </>
      )}

      {/* Empty state for root */}
      {!currentLocation && currentLocations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Keine Locations vorhanden</p>
        </div>
      )}
    </div>
  )
}
