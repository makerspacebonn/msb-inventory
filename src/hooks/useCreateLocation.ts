import type { MarkerPosition } from "@components/location/LocationMarkers"
import type { Location } from "@server/app/types"
import { useState } from "react"
import { createLocation } from "@/src/actions/locationActions"

type CreateStep =
  | { step: "idle" }
  | { step: "form"; name: string; image: string }
  | { step: "marker"; name: string; image: string }

/**
 * Create-sublocation flow shared by all location views:
 * form (name + image) → marker on the parent image (only if it has one) → save
 *
 * onCreated receives the new location, e.g. to navigate into it.
 */
export function useCreateLocation(
  parentLocation: Location | null,
  onCreated: (location: Location) => void | Promise<void>,
) {
  const [state, setState] = useState<CreateStep>({ step: "idle" })

  const start = () => setState({ step: "form", name: "", image: "" })
  const cancel = () => setState({ step: "idle" })

  const setName = (name: string) =>
    setState((s) => (s.step === "form" ? { ...s, name } : s))
  const setImage = (image: string) =>
    setState((s) => (s.step === "form" ? { ...s, image } : s))

  const save = async (marker: MarkerPosition | null) => {
    if (state.step === "idle" || !state.name.trim()) return
    const result = await createLocation({
      data: {
        name: state.name,
        image: state.image || undefined,
        parentId: parentLocation?.id ?? null,
        parentLocationMarker: marker
          ? { id: 1, x: marker.x, y: marker.y }
          : null,
      },
    })
    if (result.success && result.location) {
      setState({ step: "idle" })
      await onCreated(result.location)
    }
  }

  // Form submit: go to the marker step if the parent has an image, else save
  const submitForm = () => {
    if (state.step !== "form" || !state.name.trim()) return
    if (parentLocation?.imagePath) {
      setState({ ...state, step: "marker" })
    } else {
      void save(null)
    }
  }

  return { state, start, cancel, setName, setImage, submitForm, save }
}
