import { Input } from "@components/ui/input"
import type { Location } from "@server/app/types"
import { MapPinIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import { searchLocations } from "@/src/actions/locationActions"

type LocationWithPath = Location & { path: string }

type LocationBrowserProps = {
  locations: Location[]
  locationPath: Location[]
  onLocationClick: (location: Location) => void
  onBreadcrumbClick: (index: number) => void // -1 = root
  onStartCreate?: () => void
  renderHeader?: () => ReactNode
  renderFooter?: () => ReactNode
}

export function LocationBrowser({
  locations,
  locationPath,
  onLocationClick,
  onBreadcrumbClick,
  onStartCreate,
  renderHeader,
  renderFooter,
}: LocationBrowserProps) {
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
      <div className="relative mb-4">
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
                      alt={location.name}
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

      {/* Browse mode - only show when not searching */}
      {!searchQuery && (
        <>
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onBreadcrumbClick(-1)}
            >
              Start
            </button>
            {locationPath.map((loc, index) => (
              <span key={loc.id} className="flex items-center gap-1">
                <span className="text-muted-foreground">&rarr;</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:underline"
                  onClick={() => onBreadcrumbClick(index)}
                >
                  {loc.name}
                </button>
              </span>
            ))}
          </div>

          {renderHeader?.()}

          {/* Location grid */}
          {(locations.length > 0 || onStartCreate) && (
            <>
              {locations.length > 0 && (
                <h3 className="text-lg font-semibold mb-3">
                  {locationPath.length > 0 ? "Unterorte" : "Alle Locations"}
                </h3>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {locations.map((location) => (
                  <button
                    type="button"
                    key={location.id}
                    className="border rounded-lg p-3 flex flex-col items-center gap-2 hover:bg-muted transition-colors"
                    onClick={() => onLocationClick(location)}
                  >
                    {location.imagePath ? (
                      <img
                        src={`/img/locations/${location.imagePath}`}
                        alt={location.name}
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
                {onStartCreate && (
                  <button
                    type="button"
                    className="border border-dashed rounded-lg p-3 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                    onClick={onStartCreate}
                  >
                    <div className="w-full aspect-square flex items-center justify-center">
                      <PlusIcon className="w-12 h-12" />
                    </div>
                    <span className="text-sm font-medium">Neue Location</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Empty state */}
          {locations.length === 0 &&
            !onStartCreate &&
            locationPath.length === 0 && (
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
