import { MyCropper } from "@components/form/MyCropper"
import {
  LabelSheetItemsButton,
  LabelSheetSubtreeButton,
  LabelSheetToggle,
} from "@components/labels/LabelSheetButtons"
import { CreateLocationForm } from "@components/location/CreateLocationForm"
import { CurrentLocationCard } from "@components/location/CurrentLocationCard"
import {
  LocationBrowser,
  NewLocationButton,
} from "@components/location/LocationBrowser"
import {
  collectMarkers,
  MarkerStep,
} from "@components/location/LocationMarkers"
import { LocationPathPhotos } from "@components/location/LocationPathPhotos"
import { QRCodeLabel } from "@components/QRCodeLabel"
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
import type { Location } from "@server/app/types"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ImagePlusIcon,
  PackageIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import {
  deleteLocation as deleteLocationAction,
  fetchLocationView,
  updateLocation,
} from "@/src/actions/locationActions"
import { useAuth } from "@/src/context/AuthContext"
import { useCreateLocation } from "@/src/hooks/useCreateLocation"

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
    return await fetchLocationView({ data: id })
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
  const { baseUrl, currentLocation, locationPath, childLocations, items } =
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

  const markers = collectMarkers(childLocations, items)

  const goToLocation = (locationId: number | undefined) =>
    navigate({
      to: "/locations",
      search: locationId === undefined ? {} : { id: locationId },
    })

  const create = useCreateLocation(currentLocation, (location) =>
    goToLocation(location.id),
  )

  const handleSaveImage = async () => {
    if (!currentLocation || !newImage) return
    const result = await updateLocation({
      data: { id: currentLocation.id, image: newImage },
    })
    if (result.success) {
      setNewImage("")
      setIsDialogOpen(false)
      await goToLocation(currentLocation.id)
    }
  }

  const handleDelete = async () => {
    if (!currentLocation) return
    const result = await deleteLocationAction({ data: currentLocation.id })
    if (result.success) {
      setIsDeleteDialogOpen(false)
      await goToLocation(parentLocation?.id)
    }
  }

  const handleBreadcrumbClick = (index: number) =>
    goToLocation(index === -1 ? undefined : locationPath[index].id)

  // View: Marker placement on parent location
  if (create.state.step === "marker" && currentLocation) {
    return (
      <MarkerStep
        location={currentLocation}
        markers={markers}
        description={`Klicke auf das Bild, um die Position von "${create.state.name}" in "${currentLocation.name}" zu markieren.`}
        onConfirm={create.save}
        onCancel={create.cancel}
      />
    )
  }

  // View: Create location form
  if (create.state.step === "form") {
    return (
      <CreateLocationForm
        locationPath={locationPath}
        name={create.state.name}
        onNameChange={create.setName}
        description={create.state.description}
        onDescriptionChange={create.setDescription}
        onImageChange={create.setImage}
        onSubmit={create.submitForm}
        onCancel={create.cancel}
      />
    )
  }

  return (
    <div className="max-w-128 mx-auto">
      <h1 className="text-2xl font-bold mb-3">Locations</h1>

      <LocationBrowser
        locations={childLocations}
        locationPath={locationPath}
        onLocationClick={(location: Location) => goToLocation(location.id)}
        onBreadcrumbClick={handleBreadcrumbClick}
        onStartCreate={isLoggedIn ? create.start : undefined}
        renderHeader={(breadcrumb) =>
          currentLocation ? (
            <CurrentLocationCard
              location={currentLocation}
              markers={markers}
              breadcrumb={breadcrumb}
              actions={
                isLoggedIn && (
                  <>
                    <LabelSheetToggle
                      kind="location"
                      id={currentLocation.id}
                      name={currentLocation.name}
                    />
                    <LabelSheetSubtreeButton locationId={currentLocation.id} />
                    <LabelSheetItemsButton locationId={currentLocation.id} />
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/locations/$locationId/edit"
                        params={{ locationId: currentLocation.id.toString() }}
                        aria-label="Location bearbeiten"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                    </Button>
                    {/* With markers on the image, they have to move with it */}
                    {currentLocation.imagePath && markers.length > 0 ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to="/locations/$locationId/image"
                          params={{ locationId: currentLocation.id.toString() }}
                          aria-label="Bild ersetzen"
                        >
                          <ImagePlusIcon className="w-4 h-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Dialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Bild hinzufügen"
                          >
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
                            <MyCropper
                              onChange={(image) => setNewImage(image)}
                            />
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
                    )}
                    {canDelete && (
                      <Dialog
                        open={isDeleteDialogOpen}
                        onOpenChange={setIsDeleteDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Location löschen"
                          >
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
                  </>
                )
              }
            >
              {/* Same place as in the item's location picker */}
              {isLoggedIn && (
                <NewLocationButton onClick={create.start} className="w-full" />
              )}
              <LocationPathPhotos locationPath={locationPath} />
            </CurrentLocationCard>
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
              {/* "Ort" keeps location labels apart from item labels,
                  which only show the item's number */}
              <QRCodeLabel
                url={`${baseUrl}/l/${currentLocation.id}`}
                name={currentLocation.name}
                caption={`Ort ${currentLocation.id}`}
                printedId={`Ort ${currentLocation.id}`}
                fileName={`qr-ort-${currentLocation.id}-${currentLocation.name.replace(/[^a-zA-Z0-9]/g, "-")}`}
              />
            </>
          ) : null
        }
      />
    </div>
  )
}
