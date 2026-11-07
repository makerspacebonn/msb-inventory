import { CreateLocationForm } from "@components/location/CreateLocationForm"
import { CurrentLocationCard } from "@components/location/CurrentLocationCard"
import {
  LocationBrowser,
  NewLocationButton,
} from "@components/location/LocationBrowser"
import {
  collectMarkers,
  type MarkerPosition,
  MarkerStep,
} from "@components/location/LocationMarkers"
import { Button } from "@components/ui/button"
import type { Location } from "@server/app/types"
import { CheckIcon, ChevronLeftIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"
import type { RecentLocation } from "@/lib/recent-locations"
import {
  fetchLocationById,
  type fetchLocationView,
} from "@/src/actions/locationActions"
import { useCreateLocation } from "@/src/hooks/useCreateLocation"
import { useRecentLocations } from "@/src/hooks/useRecentLocations"

export type LocationView = Awaited<ReturnType<typeof fetchLocationView>>

/**
 * Chooses where an item goes: browse the locations, optionally create one,
 * and mark the spot on the location's image. Where the browsing is kept
 * (URL or state) is up to the caller, through `onNavigate`
 */
export function ItemLocationPicker({
  view,
  item,
  onNavigate,
  onChoose,
  onCancel,
  footer,
}: {
  view: LocationView
  /** The item being placed; no id while it's still being added */
  item: { id?: number; name: string; imageSrc?: string }
  onNavigate: (locationId: number | undefined) => void
  onChoose: (location: Location, marker: MarkerPosition | null) => void
  onCancel: () => void
  /** Shown below the locations, e.g. to save without a location */
  footer?: ReactNode
}) {
  const { currentLocation, locationPath, childLocations, items } = view
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
    items.filter((i) => i.id !== item.id),
  )

  const create = useCreateLocation(currentLocation, (location) =>
    onNavigate(location.id),
  )

  const choose = (location: Location, marker: MarkerPosition | null) => {
    addRecentLocation({
      id: location.id,
      name: location.name,
      path: locationPath.map((l) => l.name).join(" → "),
    })
    onChoose(location, marker)
  }

  const handleChooseCurrent = () => {
    if (!currentLocation) return
    if (currentLocation.imagePath) {
      setMarkerStepFor(currentLocation.id)
    } else {
      // Nothing to mark on, choose directly
      choose(currentLocation, null)
    }
  }

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
    onNavigate(location.id)
  }

  // View: Place marker for the item on the chosen location
  if (currentLocation && markerStepFor === currentLocation.id) {
    return (
      <MarkerStep
        location={currentLocation}
        markers={markers}
        description={`Klicke auf das Bild, um die Position des Items in "${currentLocation.name}" zu markieren.`}
        onConfirm={(marker) => choose(currentLocation, marker)}
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
      {/* One row: back, the item being placed and what to do with it */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Abbrechen"
          className="flex-shrink-0"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Button>
        {item.imageSrc && (
          <img
            src={item.imageSrc}
            alt=""
            className="w-9 h-9 rounded-md object-cover flex-shrink-0"
          />
        )}
        <h1 className="min-w-0 text-lg font-semibold leading-tight">
          <span className="block text-xs font-normal text-muted-foreground">
            Ort auswählen für
          </span>
          <span className="block truncate">{item.name}</span>
        </h1>
      </div>

      <LocationBrowser
        locations={childLocations}
        locationPath={locationPath}
        onLocationClick={(location: Location) => onNavigate(location.id)}
        onBreadcrumbClick={(index) =>
          onNavigate(index === -1 ? undefined : locationPath[index].id)
        }
        onStartCreate={create.start}
        recentLocations={recentLocationsLoaded ? recentLocations : []}
        onRecentLocationSelect={handleRecentLocationSelect}
        onRecentLocationRemove={removeRecentLocation}
        showRecentLocations={true}
        renderHeader={(breadcrumb) =>
          currentLocation ? (
            <CurrentLocationCard
              location={currentLocation}
              markers={markers}
              breadcrumb={breadcrumb}
            >
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleChooseCurrent}>
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Hier ablegen
                </Button>
                <NewLocationButton onClick={create.start} />
              </div>
            </CurrentLocationCard>
          ) : null
        }
      />
      {footer}
    </div>
  )
}
