import { CreateLocationForm } from "@components/location/CreateLocationForm"
import { CurrentLocationCard } from "@components/location/CurrentLocationCard"
import { LocationBrowser } from "@components/location/LocationBrowser"
import {
  collectMarkers,
  type MarkerPosition,
  MarkerStep,
} from "@components/location/LocationMarkers"
import { Button } from "@components/ui/button"
import type { Location } from "@server/app/types"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CheckIcon, ChevronLeftIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { RecentLocation } from "@/lib/recent-locations"
import { fetchItem, setItemLocation } from "@/src/actions/itemActions"
import {
  fetchLocationById,
  fetchLocationView,
} from "@/src/actions/locationActions"
import { useCreateLocation } from "@/src/hooks/useCreateLocation"
import { useRecentLocations } from "@/src/hooks/useRecentLocations"

type LocationPickerSearch = {
  at?: number // location currently shown in the picker
}

export const Route = createFileRoute("/items/$itemId/location/add")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LocationPickerSearch => {
    return {
      at: search.at ? Number(search.at) : undefined,
    }
  },
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  loaderDeps: ({ search: { at } }) => ({ at }),
  loader: async ({ params, deps: { at } }) => {
    const item = await fetchItem({ data: parseInt(params.itemId, 10) })
    // Without an explicit position, start at the item's current location
    const view = await fetchLocationView({
      data: at ?? item?.locationId ?? undefined,
    })
    return { item, itemId: params.itemId, ...view }
  },
})

function RouteComponent() {
  const { item, itemId, currentLocation, locationPath, childLocations, items } =
    Route.useLoaderData()
  const navigate = useNavigate()

  const {
    recentLocations,
    isLoaded: recentLocationsLoaded,
    addRecentLocation,
    removeRecentLocation,
  } = useRecentLocations()

  // Id of the location whose marker step is open. Keyed by id so that
  // browser navigation while the step is open can't mix up locations.
  const [markerStepFor, setMarkerStepFor] = useState<number | null>(null)

  // Markers of everything else at this location (not the item itself)
  const markers = collectMarkers(
    childLocations,
    items.filter((i) => i.id !== item?.id),
  )

  const goToLocation = (locationId: number | undefined) =>
    navigate({
      to: "/items/$itemId/location/add",
      params: { itemId },
      search: locationId === undefined ? {} : { at: locationId },
    })

  const create = useCreateLocation(currentLocation, (location) =>
    goToLocation(location.id),
  )

  const saveItemLocation = async (
    location: Location,
    marker: MarkerPosition | null,
  ) => {
    addRecentLocation({
      id: location.id,
      name: location.name,
      path: locationPath.map((l) => l.name).join(" → "),
    })

    await setItemLocation({
      data: {
        itemId: parseInt(itemId, 10),
        locationId: location.id,
        parentLocationMarker: marker
          ? { id: 1, x: marker.x, y: marker.y }
          : null,
      },
    })
    await navigate({ to: "/i/$itemId", params: { itemId } })
  }

  const handleChooseCurrent = () => {
    if (!currentLocation) return
    if (currentLocation.imagePath) {
      setMarkerStepFor(currentLocation.id)
    } else {
      // Nothing to mark on, save directly
      void saveItemLocation(currentLocation, null)
    }
  }

  const handleBreadcrumbClick = (index: number) =>
    goToLocation(index === -1 ? undefined : locationPath[index].id)

  const handleRecentLocationSelect = async (recent: RecentLocation) => {
    // Validate the location still exists
    const location = await fetchLocationById({ data: recent.id })
    if (!location) {
      removeRecentLocation(recent.id)
      toast.error("Location nicht mehr vorhanden", {
        description: `"${recent.name}" wurde gelöscht.`,
      })
      return
    }
    await goToLocation(location.id)
  }

  const handleCancel = () => navigate({ to: "/i/$itemId", params: { itemId } })

  // View: Place marker for the item on the chosen location
  if (currentLocation && markerStepFor === currentLocation.id) {
    return (
      <MarkerStep
        location={currentLocation}
        markers={markers}
        description={`Klicke auf das Bild, um die Position des Items in "${currentLocation.name}" zu markieren.`}
        onConfirm={(marker) => saveItemLocation(currentLocation, marker)}
        onCancel={() => setMarkerStepFor(null)}
      />
    )
  }

  // View: Place marker for a new sublocation on the current location
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

  // View: Create sublocation form
  if (create.state.step === "form") {
    return (
      <CreateLocationForm
        locationPath={locationPath}
        name={create.state.name}
        onNameChange={create.setName}
        onImageChange={create.setImage}
        onSubmit={create.submitForm}
        onCancel={create.cancel}
      />
    )
  }

  return (
    <div className="max-w-128 mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Abbrechen
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Ort auswählen</h1>

      {/* Item context bar */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-muted rounded-lg">
        {item?.imagePath && (
          <img
            src={`/img/items/${item.imagePath}`}
            alt={item?.name ?? ""}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <span className="font-medium">{item?.name}</span>
      </div>

      <LocationBrowser
        locations={childLocations}
        locationPath={locationPath}
        onLocationClick={(location: Location) => goToLocation(location.id)}
        onBreadcrumbClick={handleBreadcrumbClick}
        onStartCreate={create.start}
        recentLocations={recentLocationsLoaded ? recentLocations : []}
        onRecentLocationSelect={handleRecentLocationSelect}
        onRecentLocationRemove={removeRecentLocation}
        showRecentLocations={true}
        renderHeader={() =>
          currentLocation ? (
            <CurrentLocationCard location={currentLocation} markers={markers}>
              <Button className="w-full" onClick={handleChooseCurrent}>
                <CheckIcon className="w-4 h-4 mr-1" />
                Hier ablegen
              </Button>
            </CurrentLocationCard>
          ) : null
        }
      />
    </div>
  )
}
