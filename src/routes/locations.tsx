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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import fs from "fs"
import {
  ChevronLeftIcon,
  ImagePlusIcon,
  MapPinIcon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { v7 as uuidv7 } from "uuid"
import { useAuth } from "@/src/context/AuthContext"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

const fetchLocationData = createServerFn()
  .inputValidator((locationId: number | undefined) => locationId)
  .handler(async ({ data: locationId }) => {
    const locationRepo = new LocationRepository()
    const itemRepo = new ItemRepository()

    if (locationId === undefined) {
      const rootLocations = await locationRepo.findRootLocations()
      return {
        currentLocation: null,
        locationPath: [] as Location[],
        childLocations: rootLocations,
        items: [] as Item[],
      }
    }

    const currentLocation = await locationRepo.findById(locationId)
    if (!currentLocation) {
      const rootLocations = await locationRepo.findRootLocations()
      return {
        currentLocation: null,
        locationPath: [] as Location[],
        childLocations: rootLocations,
        items: [] as Item[],
      }
    }

    const [locationChain, childLocations, items] = await Promise.all([
      locationRepo.findChainForId(locationId),
      locationRepo.findByParentId(locationId),
      itemRepo.findByLocationId(locationId),
    ])

    // findChainForId returns [current, parent, grandparent, ...], we need to reverse for breadcrumbs
    const locationPath = locationChain.reverse()

    return {
      currentLocation,
      locationPath,
      childLocations,
      items,
    }
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
  .middleware([authGuardMiddleware])
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

const deleteLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator((locationId: number) => locationId)
  .handler(async ({ data: locationId }) => {
    const deleted = await new LocationRepository().delete(locationId)
    return { success: deleted }
  })

type LocationSearch = {
  id?: number
}

export const Route = createFileRoute("/locations")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LocationSearch => {
    return {
      id: search.id ? Number(search.id) : undefined,
    }
  },
  loaderDeps: ({ search: { id } }) => ({ id }),
  loader: async ({ deps: { id } }) => {
    return await fetchLocationData({ data: id })
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.currentLocation
          ? `${loaderData.currentLocation.name} | Locations | MSB Inventar`
          : "Locations | MSB Inventar",
      },
    ],
  }),
})

function RouteComponent() {
  const { currentLocation, locationPath, childLocations, items } =
    Route.useLoaderData()
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [newImage, setNewImage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const parentLocation =
    locationPath.length > 1 ? locationPath[locationPath.length - 2] : null

  const canDelete =
    isLoggedIn &&
    currentLocation &&
    childLocations.length === 0 &&
    items.length === 0

  const handleSaveImage = async () => {
    if (!currentLocation || !newImage) return
    const result = await updateLocationImage({
      data: { locationId: currentLocation.id, image: newImage },
    })
    if (result.success) {
      setNewImage("")
      setIsDialogOpen(false)
      // Refresh the current route to get updated data
      await navigate({ to: "/locations", search: { id: currentLocation.id } })
    }
  }

  const handleDelete = async () => {
    if (!currentLocation) return
    const result = await deleteLocation({ data: currentLocation.id })
    if (result.success) {
      setIsDeleteDialogOpen(false)
      // Navigate to parent location or root
      await navigate({
        to: "/locations",
        search: parentLocation ? { id: parentLocation.id } : {},
      })
    }
  }

  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Locations</h1>

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {currentLocation && (
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/locations"
              search={parentLocation ? { id: parentLocation.id } : {}}
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Zurück
            </Link>
          </Button>
        )}
        <Link
          to="/locations"
          search={{}}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Start
        </Link>
        {locationPath.map((loc) => (
          <span key={loc.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">→</span>
            <Link
              to="/locations"
              search={{ id: loc.id }}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {loc.name}
            </Link>
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
            {isLoggedIn && (
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ImagePlusIcon className="w-4 h-4" />
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
                  {canDelete && (
                  <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2Icon className="w-4 h-4 text-destructive" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Location löschen</DialogTitle>
                        <DialogDescription>
                          Möchtest du "{currentLocation.name}" wirklich löschen?
                          Diese Aktion kann nicht rückgängig gemacht werden.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Abbrechen</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={handleDelete}>
                          Löschen
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Child locations grid */}
      {childLocations.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-3">
            {currentLocation ? "Unterorte" : "Alle Locations"}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {childLocations.map((location) => (
              <Link
                key={location.id}
                to="/locations"
                search={{ id: location.id }}
                className="border rounded-lg p-3 flex flex-col items-center gap-2 hover:bg-muted transition-colors"
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
              </Link>
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
      {!currentLocation && childLocations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Keine Locations vorhanden</p>
        </div>
      )}
    </div>
  )
}
