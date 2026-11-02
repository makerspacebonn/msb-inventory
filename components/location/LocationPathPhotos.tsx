import { LocationComponent } from "@components/LocationComponent"
import { Button } from "@components/ui/button"
import type { Location } from "@server/app/types"
import { RouteIcon } from "lucide-react"
import { useId, useState } from "react"

// Unfoldable photo chain from the top level down to the parent of the
// last location in the path. Each photo marks where the next location sits,
// the same way an item's "Wo finde ich es?" section does.
export function LocationPathPhotos({
  locationPath,
}: {
  locationPath: Location[] // root → current
}) {
  const [open, setOpen] = useState(false)
  const contentId = useId()

  // Nothing to show for top-level locations
  if (locationPath.length < 2) return null

  return (
    <div>
      <Button
        variant="outline"
        className="w-full"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
      >
        <RouteIcon className="w-4 h-4 mr-1" />
        {open ? "Pfad ausblenden" : "Pfad anzeigen"}
      </Button>
      {open && (
        <ol id={contentId} className="flex flex-col items-center w-full mt-2">
          {locationPath.slice(0, -1).map((location, index) => (
            <li key={location.id} className="flex flex-col items-center w-full">
              <LocationComponent
                location={location}
                marker={locationPath[index + 1].parentLocationMarker}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
