import { collectMarkers } from "@components/location/LocationMarkers"
import { ReplaceImageSteps } from "@components/location/ReplaceImageSteps"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import {
  fetchLocationView,
  replaceLocationImage,
} from "@/src/actions/locationActions"
import { requireLogin } from "@/src/lib/access"
import type { MarkerUpdate } from "@/src/lib/markerUpdates"
import { showError } from "@/src/lib/showError"

export const Route = createFileRoute("/locations_/$locationId/image")({
  component: RouteComponent,
  beforeLoad: ({ context }) => requireLogin(context),
  loader: async ({ params }) => {
    const id = parseInt(params.locationId, 10)
    const view = await fetchLocationView({ data: id })
    const location = view.currentLocation
    const markers = collectMarkers(view.childLocations, view.items)
    // Nothing to carry over: the simple dialog on the location's page does
    if (!location?.imagePath || markers.length === 0) {
      throw redirect({ to: "/locations", search: { id } })
    }
    return { location, markers }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.location.name}: Bild ersetzen | MSB Inventar`
          : "Bild ersetzen | MSB Inventar",
      },
    ],
  }),
})

function RouteComponent() {
  const { location, markers } = Route.useLoaderData()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const backToLocation = () =>
    navigate({ to: "/locations", search: { id: location.id } })

  const save = async (image: string, updates: MarkerUpdate[]) => {
    setSaving(true)
    try {
      await replaceLocationImage({
        data: { locationId: location.id, image, markers: updates },
      })
      await backToLocation()
      toast.success("Bild ersetzt")
    } catch (error) {
      showError(error, "Das Bild konnte nicht ersetzt werden.")
      setSaving(false)
    }
  }

  return (
    <ReplaceImageSteps
      location={location}
      markers={markers}
      saving={saving}
      onSave={save}
      onCancel={backToLocation}
    />
  )
}
