import { ClockIcon, MapPinIcon, XIcon } from "lucide-react"
import { useId } from "react"
import type { RecentLocation } from "@/lib/recent-locations"

type RecentLocationsListProps = {
  locations: RecentLocation[]
  onSelect: (location: RecentLocation) => void
  onRemove: (locationId: number) => void
}

export function RecentLocationsList({
  locations,
  onSelect,
  onRemove,
}: RecentLocationsListProps) {
  const labelId = useId()
  if (locations.length === 0) return null

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
        <ClockIcon className="w-4 h-4" />
        <span id={labelId}>Zuletzt verwendet</span>
      </div>
      {/* One row that scrolls sideways, so it never takes more height */}
      <ul
        aria-labelledby={labelId}
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
      >
        {locations.map((location) => (
          <li
            key={location.id}
            className="relative inline-flex flex-shrink-0 items-center"
          >
            <button
              type="button"
              onClick={() => onSelect(location)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors pr-8"
              title={location.path}
            >
              <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{location.name}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(location.id)
              }}
              className="absolute right-1 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20"
              aria-label={`${location.name} aus "Zuletzt verwendet" entfernen`}
            >
              <XIcon className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
