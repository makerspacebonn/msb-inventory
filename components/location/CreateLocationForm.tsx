import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import type { Location } from "@server/app/types"
import { CheckIcon, ChevronLeftIcon } from "lucide-react"

type CreateLocationFormProps = {
  locationPath: Location[]
  name: string
  onNameChange: (name: string) => void
  onImageChange: (image: string) => void
  onProceedToMarker: () => void
  onConfirmCreate: () => void
  onCancel: () => void
}

export function CreateLocationForm({
  locationPath,
  name,
  onNameChange,
  onImageChange,
  onProceedToMarker,
  onConfirmCreate,
  onCancel,
}: CreateLocationFormProps) {
  const parentLocation =
    locationPath.length > 0 ? locationPath[locationPath.length - 1] : null

  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Neue Location erstellen</h1>
      {parentLocation && (
        <p className="text-muted-foreground mb-4">
          In: {locationPath.map((loc) => loc.name).join(" \u2192 ")}
        </p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
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
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name der Location"
          />
        </div>

        <div>
          <MyCropper onChange={onImageChange} />
        </div>

        <div className="flex gap-2">
          {parentLocation ? (
            <Button onClick={onProceedToMarker} disabled={!name.trim()}>
              Weiter zur Markierung
            </Button>
          ) : (
            <Button onClick={onConfirmCreate} disabled={!name.trim()}>
              <CheckIcon className="w-4 h-4 mr-1" />
              Erstellen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
