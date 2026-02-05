import { ClockIcon, MapPinIcon, XIcon } from "lucide-react"
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
  if (locations.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
        <ClockIcon className="w-4 h-4" />
        <span>Zuletzt verwendet</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {locations.map((location) => (
          <div
            key={location.id}
            className="group relative inline-flex items-center"
          >
            <button
              type="button"
              onClick={() => onSelect(location)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors pr-7"
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
              className="absolute right-1.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity"
              title="Entfernen"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
