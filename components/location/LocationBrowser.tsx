import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import type { Location } from "@server/app/types"
import { MapPinIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import type { RecentLocation } from "@/lib/recent-locations"
import { searchLocations } from "@/src/actions/locationActions"
import { RecentLocationsList } from "./RecentLocationsList"

type LocationWithPath = Location & { path: string }

type LocationBrowserProps = {
  locations: Location[]
  locationPath: Location[]
  onLocationClick: (location: Location) => void
  onBreadcrumbClick: (index: number) => void // -1 = root
  onStartCreate?: () => void
  // Receives the breadcrumb (null at the top level) to show inside it
  renderHeader?: (breadcrumb: ReactNode) => ReactNode
  renderFooter?: () => ReactNode
  // Recent locations props
  recentLocations?: RecentLocation[]
  onRecentLocationSelect?: (location: RecentLocation) => void
  onRecentLocationRemove?: (locationId: number) => void
  showRecentLocations?: boolean
}

export function LocationBrowser({
  locations,
  locationPath,
  onLocationClick,
  onBreadcrumbClick,
  onStartCreate,
  renderHeader,
  renderFooter,
  recentLocations,
  onRecentLocationSelect,
  onRecentLocationRemove,
  showRecentLocations = false,
}: LocationBrowserProps) {
  const atRoot = locationPath.length === 0
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<LocationWithPath[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const results = await searchLocations({ data: query })
    setSearchResults(results)
    setIsSearching(false)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <>
      {/* Search input */}
      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Location suchen..."
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Suche leeren"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="mb-6">
          {isSearching ? (
            <p className="text-muted-foreground text-sm">Suche...</p>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((location) => (
                <button
                  type="button"
                  key={location.id}
                  className="w-full border rounded-lg p-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    clearSearch()
                    onLocationClick(location)
                  }}
                >
                  {location.imagePath ? (
                    <img
                      src={`/img/locations/${location.imagePath}`}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{location.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {location.path}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Keine Ergebnisse gefunden
            </p>
          )}
        </div>
      )}

      {/* Recent locations - show when not searching */}
      {!searchQuery &&
        showRecentLocations &&
        recentLocations &&
        recentLocations.length > 0 &&
        onRecentLocationSelect &&
        onRecentLocationRemove && (
          <RecentLocationsList
            locations={recentLocations}
            onSelect={onRecentLocationSelect}
            onRemove={onRecentLocationRemove}
          />
        )}

      {/* Browse mode - only show when not searching */}
      {!searchQuery && (
        <>
          {renderHeader?.(
            locationPath.length > 0 ? (
              <Breadcrumb
                ancestors={locationPath.slice(0, -1)}
                onClick={onBreadcrumbClick}
              />
            ) : null,
          )}

          {/* Location grid. Inside a location, creating a sublocation is
              offered by the page next to its main action; at the top level
              there's no such place, so it sits next to the heading */}
          {(locations.length > 0 || (atRoot && onStartCreate)) && (
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-lg font-semibold">
                {atRoot ? "Alle Locations" : "Unterorte"}
              </h3>
              {atRoot && onStartCreate && (
                <NewLocationButton onClick={onStartCreate} size="sm" />
              )}
            </div>
          )}
          {locations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {locations.map((location) => (
                <button
                  type="button"
                  key={location.id}
                  className="border rounded-lg p-2 flex flex-col items-center gap-2 hover:bg-muted transition-colors"
                  onClick={() => onLocationClick(location)}
                >
                  {location.imagePath ? (
                    <img
                      src={`/img/locations/${location.imagePath}`}
                      alt=""
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
                      <MapPinIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-center">
                    {location.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {locations.length === 0 && !onStartCreate && atRoot && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Keine Locations vorhanden</p>
            </div>
          )}

          {renderFooter?.()}
        </>
      )}
    </>
  )
}

/** Path to the current location's parent; the current one is the heading */
function Breadcrumb({
  ancestors,
  onClick,
}: {
  ancestors: Location[]
  onClick: (index: number) => void // -1 = root
}) {
  const crumbs = [{ id: "start", name: "Start" }, ...ancestors]
  return (
    <nav aria-label="Pfad" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <li key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">&rarr;</span>}
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => onClick(i - 1)}
            >
              {crumb.name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Starts creating a location below the current one */
export function NewLocationButton({
  onClick,
  size,
  className,
}: {
  onClick: () => void
  size?: "sm"
  className?: string
}) {
  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      onClick={onClick}
    >
      <PlusIcon className="w-4 h-4 mr-1" />
      Neue Location
    </Button>
  )
}
