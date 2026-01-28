import { MyCropper } from "@components/form/MyCropper"
import { CreateLocationForm } from "@components/location/CreateLocationForm"
import { LocationBrowser } from "@components/location/LocationBrowser"
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
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import {
  CheckIcon,
  ChevronLeftIcon,
  CrosshairIcon,
  ImagePlusIcon,
  MapPinIcon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react"
import { type MouseEvent, type RefObject, useRef, useState } from "react"
import {
  createLocation,
  deleteLocation as deleteLocationAction,
  updateLocation,
} from "@/src/actions/locationActions"
import { useAuth } from "@/src/context/AuthContext"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

type MarkerPosition = { x: number; y: number }

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

    const locationPath = locationChain.reverse()

    return {
      currentLocation,
      locationPath,
      childLocations,
      items,
    }
  })

function ImageMarkerPicker({
  imagePath,
  name,
  markerPosition,
  onImageClick,
  imageRef,
}: {
  imagePath: string | null
  name: string
  markerPosition: MarkerPosition | null
  onImageClick: (e: MouseEvent<HTMLButtonElement>) => void
  imageRef: RefObject<HTMLImageElement | null>
}) {
  if (!imagePath) {
    return (
      <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
        <MapPinIcon className="w-24 h-24 text-gray-400" />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="relative inline-block w-full"
      onClick={onImageClick}
    >
      <img
        ref={imageRef}
        src={`/img/locations/${imagePath}`}
        alt={name}
        className="w-full rounded-lg cursor-crosshair"
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
    </button>
  )
}

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
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const imageRef = useRef<HTMLImageElement>(null)
  const [newImage, setNewImage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Create location state
  const [isCreating, setIsCreating] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createImage, setCreateImage] = useState("")
  const [pendingCreate, setPendingCreate] = useState<{
    name: string
    image: string
  } | null>(null)
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(
    null,
  )

  const parentLocation =
    locationPath.length > 1 ? locationPath[locationPath.length - 2] : null

  const canDelete =
    isLoggedIn &&
    currentLocation &&
    childLocations.length === 0 &&
    items.length === 0

  const handleSaveImage = async () => {
    if (!currentLocation || !newImage) return
    const result = await updateLocation({
      data: { id: currentLocation.id, image: newImage },
    })
    if (result.success) {
      setNewImage("")
      setIsDialogOpen(false)
      await navigate({ to: "/locations", search: { id: currentLocation.id } })
    }
  }

  const handleDelete = async () => {
    if (!currentLocation) return
    const result = await deleteLocationAction({ data: currentLocation.id })
    if (result.success) {
      setIsDeleteDialogOpen(false)
      await navigate({
        to: "/locations",
        search: parentLocation ? { id: parentLocation.id } : {},
      })
    }
  }

  const handleLocationClick = (location: Location) => {
    navigate({ to: "/locations", search: { id: location.id } })
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      navigate({ to: "/locations", search: {} })
    } else {
      navigate({ to: "/locations", search: { id: locationPath[index].id } })
    }
  }

  const handleStartCreate = () => {
    setIsCreating(true)
    setCreateName("")
    setCreateImage("")
    setPendingCreate(null)
    setMarkerPosition(null)
  }

  const handleCancelCreate = () => {
    setIsCreating(false)
    setCreateName("")
    setCreateImage("")
    setPendingCreate(null)
    setMarkerPosition(null)
  }

  const handleProceedToMarker = () => {
    if (!createName.trim()) return
    setPendingCreate({ name: createName, image: createImage })
    setMarkerPosition(null)
  }

  const handleConfirmCreate = async () => {
    const name = pendingCreate?.name ?? createName
    const image = pendingCreate?.image ?? createImage
    if (!name.trim()) return

    const result = await createLocation({
      data: {
        name,
        image: image || undefined,
        parentId: currentLocation?.id ?? null,
        parentLocationMarker: markerPosition
          ? { id: 1, x: markerPosition.x, y: markerPosition.y }
          : null,
      },
    })
    if (result.success && result.location) {
      setIsCreating(false)
      setCreateName("")
      setCreateImage("")
      setPendingCreate(null)
      setMarkerPosition(null)
      await router.invalidate()
    }
  }

  const handleImageClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setMarkerPosition({ x, y })
  }

  // View: Marker placement on parent location
  if (pendingCreate && currentLocation) {
    return (
      <div className="max-w-128 mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Position markieren</h1>
        <p className="text-muted-foreground mb-4">
          Klicke auf das Bild, um die Position von "{pendingCreate.name}" in "
          {currentLocation.name}" zu markieren.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={handleCancelCreate}>
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Abbrechen
          </Button>
        </div>

        <ImageMarkerPicker
          imagePath={currentLocation.imagePath}
          name={currentLocation.name}
          markerPosition={markerPosition}
          onImageClick={handleImageClick}
          imageRef={imageRef}
        />

        <div className="mt-4 flex gap-2">
          {currentLocation.imagePath ? (
            <>
              <Button onClick={handleConfirmCreate} disabled={!markerPosition}>
                <CheckIcon className="w-4 h-4 mr-1" />
                Speichern
              </Button>
              <Button variant="outline" onClick={handleConfirmCreate}>
                Ohne Markierung speichern
              </Button>
            </>
          ) : (
            <Button onClick={handleConfirmCreate}>
              <CheckIcon className="w-4 h-4 mr-1" />
              Speichern
            </Button>
          )}
        </div>
      </div>
    )
  }

  // View: Create location form
  if (isCreating) {
    return (
      <CreateLocationForm
        locationPath={currentLocation ? locationPath : []}
        name={createName}
        onNameChange={setCreateName}
        onImageChange={setCreateImage}
        onProceedToMarker={handleProceedToMarker}
        onConfirmCreate={handleConfirmCreate}
        onCancel={handleCancelCreate}
      />
    )
  }

  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Locations</h1>

      <LocationBrowser
        locations={childLocations}
        locationPath={locationPath}
        onLocationClick={handleLocationClick}
        onBreadcrumbClick={handleBreadcrumbClick}
        onStartCreate={isLoggedIn ? handleStartCreate : undefined}
        renderHeader={() =>
          currentLocation ? (
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
                          <Button
                            onClick={handleSaveImage}
                            disabled={!newImage}
                          >
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
                              Möchtest du "{currentLocation.name}" wirklich
                              löschen? Diese Aktion kann nicht rückgängig
                              gemacht werden.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Abbrechen</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={handleDelete}
                            >
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
          ) : null
        }
        renderFooter={() =>
          currentLocation ? (
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
          ) : null
        }
      />
    </div>
  )
}
