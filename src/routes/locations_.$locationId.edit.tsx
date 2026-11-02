import { CurrentLocationCard } from "@components/location/CurrentLocationCard"
import { LocationBrowser } from "@components/location/LocationBrowser"
import {
  collectMarkers,
  type MarkerPosition,
  MarkerStep,
} from "@components/location/LocationMarkers"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import type { Location, ParentLocationMarker } from "@server/app/types"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CheckIcon,
  ChevronLeftIcon,
  CrosshairIcon,
  FolderInputIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  fetchLocationView,
  updateLocation,
} from "@/src/actions/locationActions"

type LocationView = Awaited<ReturnType<typeof fetchLocationView>>

// Where the location sits: its parent (null = top level) with the parent's
// path and the marker on the parent's image
type Placement = {
  parentPath: Location[] // root → parent, empty at top level
  marker: ParentLocationMarker | null
}

type Step =
  | { step: "form" }
  | { step: "pick"; view: LocationView }
  // view = the parent candidate; back = where "Zurück" leads
  | { step: "marker"; view: LocationView; back: Step }

export const Route = createFileRoute("/locations_/$locationId/edit")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  loader: async ({ params }) => {
    const view = await fetchLocationView({
      data: parseInt(params.locationId, 10),
    })
    if (!view.currentLocation) throw new Error("Location nicht gefunden")
    return { ...view, location: view.currentLocation }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.location.name} bearbeiten | MSB Inventar`
          : "Location bearbeiten | MSB Inventar",
      },
    ],
  }),
})

const pathText = (path: Location[]) =>
  path.length > 0 ? path.map((l) => l.name).join(" → ") : "Oberste Ebene"

const toParentMarker = (
  marker: MarkerPosition | null,
): ParentLocationMarker | null =>
  marker ? { id: 1, x: marker.x, y: marker.y } : null

function RouteComponent() {
  const { location, locationPath } = Route.useLoaderData()
  const navigate = useNavigate()

  const [name, setName] = useState(location.name)
  const [description, setDescription] = useState(location.description ?? "")
  const [placement, setPlacement] = useState<Placement>({
    parentPath: locationPath.slice(0, -1),
    marker: location.parentLocationMarker ?? null,
  })
  const [step, setStep] = useState<Step>({ step: "form" })
  const [isSaving, setIsSaving] = useState(false)

  const parent = placement.parentPath.at(-1) ?? null
  const backToLocation = () =>
    navigate({ to: "/locations", search: { id: location.id } })

  // Loads a location level for the picker. Refuses levels inside the
  // edited location: it can't be moved into itself or its sublocations.
  const loadView = async (locationId: number | undefined) => {
    const view = await fetchLocationView({ data: locationId })
    if (view.locationPath.some((l) => l.id === location.id)) {
      toast.error(
        "Eine Location kann nicht in sich selbst oder einen ihrer Unterorte verschoben werden",
      )
      return null
    }
    return view
  }

  const openPicker = async (locationId: number | undefined) => {
    const view = await loadView(locationId)
    if (view) setStep({ step: "pick", view })
  }

  // The parent candidate was chosen: mark the position if it has an image
  const chooseParent = (view: LocationView, back: Step) => {
    if (view.currentLocation?.imagePath) {
      setStep({ step: "marker", view, back })
    } else {
      setPlacement({ parentPath: view.locationPath, marker: null })
      setStep({ step: "form" })
    }
  }

  const changeMarker = async () => {
    const view = await loadView(parent?.id)
    if (view) chooseParent(view, { step: "form" })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateLocation({
      data: {
        id: location.id,
        name,
        description,
        parentId: parent?.id ?? null,
        parentLocationMarker: placement.marker,
      },
    })
    setIsSaving(false)
    if (!result.success) {
      toast.error(result.message ?? "Speichern fehlgeschlagen")
      return
    }
    toast.success("Location gespeichert")
    await backToLocation()
  }

  // View: mark the position on the chosen parent
  if (step.step === "marker" && step.view.currentLocation) {
    const target = step.view.currentLocation
    const isCurrentParent = target.id === parent?.id
    return (
      <MarkerStep
        location={target}
        // Everything else at the parent, without the edited location
        markers={collectMarkers(
          step.view.childLocations.filter((l) => l.id !== location.id),
          step.view.items,
        )}
        description={`Klicke auf das Bild, um die Position von "${name || location.name}" in "${target.name}" zu markieren.`}
        initialPosition={isCurrentParent ? placement.marker : null}
        onConfirm={(marker) => {
          setPlacement({
            parentPath: step.view.locationPath,
            marker: toParentMarker(marker),
          })
          setStep({ step: "form" })
        }}
        onCancel={() => setStep(step.back)}
      />
    )
  }

  // View: choose the new parent
  if (step.step === "pick") {
    const { view } = step
    return (
      <div className="max-w-128 mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep({ step: "form" })}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Zurück
          </Button>
        </div>
        <h1 className="text-2xl font-bold mb-6">Neuen Ort wählen</h1>
        <p className="text-muted-foreground mb-4">
          Wohin soll "{location.name}" verschoben werden?
        </p>

        <LocationBrowser
          // The edited location can't be its own parent
          locations={view.childLocations.filter((l) => l.id !== location.id)}
          locationPath={view.locationPath}
          onLocationClick={(l) => openPicker(l.id)}
          onBreadcrumbClick={(index) =>
            openPicker(index === -1 ? undefined : view.locationPath[index].id)
          }
          renderHeader={() =>
            view.currentLocation ? (
              <CurrentLocationCard
                location={view.currentLocation}
                markers={collectMarkers(view.childLocations, view.items)}
              >
                <Button
                  className="w-full"
                  onClick={() => chooseParent(view, step)}
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Hier ablegen
                </Button>
              </CurrentLocationCard>
            ) : (
              <Button
                className="w-full mb-6"
                onClick={() => chooseParent(view, step)}
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Auf oberster Ebene ablegen
              </Button>
            )
          }
        />
      </div>
    )
  }

  // View: edit form
  return (
    <div className="max-w-128 mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={backToLocation}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Abbrechen
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Location bearbeiten</h1>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="locationName"
            className="block text-sm font-medium mb-1"
          >
            Name
          </label>
          <Input
            id="locationName"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="locationDescription"
            className="block text-sm font-medium mb-1"
          >
            Beschreibung
          </label>
          <Textarea
            id="locationDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <section aria-labelledby="placement-heading" className="space-y-2">
          <h2 id="placement-heading" className="text-sm font-medium">
            Ort
          </h2>
          <p data-testid="location-parent-path">
            {pathText(placement.parentPath)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPicker(parent?.id)}
            >
              <FolderInputIcon className="w-4 h-4 mr-1" />
              Verschieben
            </Button>
            {parent?.imagePath && (
              <Button variant="outline" size="sm" onClick={changeMarker}>
                <CrosshairIcon className="w-4 h-4 mr-1" />
                {placement.marker ? "Position ändern" : "Position markieren"}
              </Button>
            )}
          </div>
          {parent?.imagePath && (
            <p className="text-sm text-muted-foreground">
              {placement.marker
                ? `Position auf dem Bild von "${parent.name}" markiert`
                : `Keine Position auf dem Bild von "${parent.name}" markiert`}
            </p>
          )}
        </section>

        <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
          <CheckIcon className="w-4 h-4 mr-1" />
          Speichern
        </Button>
      </div>
    </div>
  )
}
