import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import type { Location } from "@server/app/types"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CheckIcon,
  ChevronLeftIcon,
  CrosshairIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { type MouseEvent, type RefObject, useRef, useState } from "react"
import { fetchItem, setItemLocation } from "@/src/actions/itemActions"
import {
  createLocation,
  fetchChildLocations,
  fetchLocationChain,
  fetchRootLocations,
  searchLocations,
} from "@/src/actions/locationActions"

// Types
type MarkerPosition = { x: number; y: number }

type CreateLocationState = {
  isCreating: boolean
  name: string
  image: string
  pending: { name: string; image: string } | null
}

// Custom hook for location navigation
function useLocationNavigation(
  rootLocations: Location[],
  initialLocations: Location[],
  initialPath: Location[],
) {
  const [currentLocations, setCurrentLocations] =
    useState<Location[]>(initialLocations)
  const [locationPath, setLocationPath] = useState<Location[]>(initialPath)

  const navigateToLocation = async (location: Location) => {
    const children = await fetchChildLocations({ data: location.id })
    setLocationPath([...locationPath, location])
    setCurrentLocations(children)
  }

  const navigateBack = async () => {
    if (locationPath.length === 1) {
      setCurrentLocations(rootLocations)
      setLocationPath([])
    } else if (locationPath.length > 1) {
      const newPath = locationPath.slice(0, -1)
      const parentLocation = newPath[newPath.length - 1]
      setLocationPath(newPath)
      const children = await fetchChildLocations({ data: parentLocation.id })
      setCurrentLocations(children)
    }
  }

  const navigateToBreadcrumb = async (index: number) => {
    if (index === -1) {
      setCurrentLocations(rootLocations)
      setLocationPath([])
    } else {
      const newPath = locationPath.slice(0, index + 1)
      const targetLocation = newPath[index]
      setLocationPath(newPath)
      const children = await fetchChildLocations({ data: targetLocation.id })
      setCurrentLocations(children)
    }
  }

  const addLocation = (location: Location) => {
    setCurrentLocations([...currentLocations, location])
  }

  return {
    currentLocations,
    locationPath,
    navigateToLocation,
    navigateBack,
    navigateToBreadcrumb,
    addLocation,
  }
}

// Shared component for image with marker picker
function ImageMarkerPicker({
  imagePath,
  imagePathPrefix,
  name,
  markerPosition,
  onImageClick,
  imageRef,
}: {
  imagePath: string | null
  imagePathPrefix: string
  name: string
  markerPosition: MarkerPosition | null
  onImageClick: (e: MouseEvent<HTMLButtonElement>) => void
  imageRef: RefObject<HTMLImageElement | null>
}) {
  if (!imagePath) {
    return (
      <div className="w-full aspect-square rounded-2xl bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center">
        <MapPinIcon className="w-24 h-24 text-gray-400" />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="relative inline-block w-full"
      onClick={onImageClick}
    >
      <img
        ref={imageRef}
        src={`${imagePathPrefix}${imagePath}`}
        alt={name}
        className="w-full rounded-lg cursor-crosshair"
      />
      {markerPosition && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${markerPosition.x}%`,
            top: `${markerPosition.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <CrosshairIcon className="w-8 h-8 text-red-500 drop-shadow-lg" />
        </div>
      )}
    </button>
  )
}

// Marker action buttons
function MarkerActionButtons({
  hasImage,
  hasMarker,
  onConfirm,
}: {
  hasImage: boolean
  hasMarker: boolean
  onConfirm: () => void
}) {
  if (!hasImage) {
    return (
      <Button onClick={onConfirm}>
        <CheckIcon className="w-4 h-4 mr-1" />
        Speichern
      </Button>
    )
  }

  return (
    <>
      <Button onClick={onConfirm} disabled={!hasMarker}>
        <CheckIcon className="w-4 h-4 mr-1" />
        Speichern
      </Button>
      <Button variant="outline" onClick={onConfirm}>
        Ohne Markierung speichern
      </Button>
    </>
  )
}

// View: Place marker on parent for new location
function CreateLocationMarkerView({
  pendingLocation,
  parentLocation,
  markerPosition,
  imageRef,
  onImageClick,
  onConfirm,
  onCancel,
}: {
  pendingLocation: { name: string; image: string }
  parentLocation: Location
  markerPosition: MarkerPosition | null
  imageRef: RefObject<HTMLImageElement | null>
  onImageClick: (e: MouseEvent<HTMLButtonElement>) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Position markieren</h1>
      <p className="text-muted-foreground mb-4">
        Klicke auf das Bild, um die Position von "{pendingLocation.name}" in "
        {parentLocation.name}" zu markieren.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Abbrechen
        </Button>
      </div>

      <ImageMarkerPicker
        imagePath={parentLocation.imagePath}
        imagePathPrefix="/img/locations/"
        name={parentLocation.name}
        markerPosition={markerPosition}
        onImageClick={onImageClick}
        imageRef={imageRef}
      />

      <div className="mt-4 flex gap-2">
        <MarkerActionButtons
          hasImage={!!parentLocation.imagePath}
          hasMarker={!!markerPosition}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  )
}

// View: Create new location form
function CreateLocationForm({
  locationPath,
  name,
  onNameChange,
  onImageChange,
  onProceedToMarker,
  onConfirmCreate,
  onCancel,
}: {
  locationPath: Location[]
  name: string
  onNameChange: (name: string) => void
  onImageChange: (image: string) => void
  onProceedToMarker: () => void
  onConfirmCreate: () => void
  onCancel: () => void
}) {
  const parentLocation =
    locationPath.length > 0 ? locationPath[locationPath.length - 1] : null

  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Neue Location erstellen</h1>
      {parentLocation && (
        <p className="text-muted-foreground mb-4">
          In: {locationPath.map((loc) => loc.name).join(" → ")}
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

// View: Place marker on selected location for item
function MarkerSelectionView({
  location,
  markerPosition,
  imageRef,
  onImageClick,
  onConfirm,
  onBack,
}: {
  location: Location
  markerPosition: MarkerPosition | null
  imageRef: RefObject<HTMLImageElement | null>
  onImageClick: (e: MouseEvent<HTMLButtonElement>) => void
  onConfirm: () => void
  onBack: () => void
}) {
  return (
    <div className="max-w-128 mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Position markieren</h1>
      <p className="text-muted-foreground mb-4">
        Klicke auf das Bild, um die Position des Items in "{location.name}" zu
        markieren.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Zurück
        </Button>
      </div>

      <ImageMarkerPicker
        imagePath={location.imagePath}
        imagePathPrefix="/img/locations/"
        name={location.name}
        markerPosition={markerPosition}
        onImageClick={onImageClick}
        imageRef={imageRef}
      />

      <div className="mt-4 flex gap-2">
        <MarkerActionButtons
          hasImage={!!location.imagePath}
          hasMarker={!!markerPosition}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  )
}

// Type for search results with path
type LocationWithPath = Location & { path: string }

// View: Browse and select locations
function LocationSelectionView({
  item,
  currentLocations,
  locationPath,
  onLocationClick,
  onSelectCurrent,
  onBreadcrumbClick,
  onStartCreate,
  onCancel,
}: {
  item: { name: string; imagePath: string | null } | null
  currentLocations: Location[]
  locationPath: Location[]
  onLocationClick: (location: Location) => void
  onSelectCurrent: () => void
  onBreadcrumbClick: (index: number) => void
  onStartCreate: () => void
  onCancel: () => void
}) {
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
    <div className="max-w-128 mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Abbrechen
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Ort auswählen</h1>
      <div className="flex items-center gap-3 mb-6 p-3 bg-muted rounded-lg">
        {item?.imagePath && (
          <img
            src={`/img/items/${item.imagePath}`}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <span className="font-medium">{item?.name}</span>
      </div>

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
                <span className="text-muted-foreground">→</span>
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

          {locationPath.length > 0 && (
            <div className="mb-4">
              <Button onClick={onSelectCurrent}>
                <CheckIcon className="w-4 h-4 mr-1" />"
                {locationPath[locationPath.length - 1].name}" auswählen
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentLocations.map((location) => (
              <button
                type="button"
                key={location.id}
                className="border rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-muted transition-colors"
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
                <span className="text-lg font-medium">{location.name}</span>
              </button>
            ))}
            <button
              type="button"
              className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              onClick={onStartCreate}
            >
              <div className="w-full aspect-square flex items-center justify-center">
                <PlusIcon className="w-12 h-12" />
              </div>
              <span className="text-lg font-medium">Neue Location</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Route definition
export const Route = createFileRoute("/items/$itemId/location/add")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  loader: async ({ params }) => {
    const [locations, item] = await Promise.all([
      fetchRootLocations(),
      fetchItem({ data: parseInt(params.itemId, 10) }),
    ])
    let initialPath: Location[] = []
    let initialLocations = locations
    if (item?.locationId) {
      const chain = await fetchLocationChain({ data: item.locationId })
      initialPath = chain
      if (chain.length > 0) {
        const parentId = chain[chain.length - 1].id
        initialLocations = await fetchChildLocations({ data: parentId })
      }
    }
    return {
      locations,
      item,
      itemId: params.itemId,
      initialPath,
      initialLocations,
    }
  },
})

function RouteComponent() {
  const {
    locations: rootLocations,
    item,
    itemId,
    initialPath,
    initialLocations,
  } = Route.useLoaderData()

  const navigate = useNavigate()
  const imageRef = useRef<HTMLImageElement>(null)

  // Location navigation
  const {
    currentLocations,
    locationPath,
    navigateToLocation,
    navigateToBreadcrumb,
    addLocation,
  } = useLocationNavigation(rootLocations, initialLocations, initialPath)

  // Selection state
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  )
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(
    null,
  )

  // Create location state
  const [createState, setCreateState] = useState<CreateLocationState>({
    isCreating: false,
    name: "",
    image: "",
    pending: null,
  })

  const handleImageClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setMarkerPosition({ x, y })
  }

  const handleSelect = (location: Location) => {
    setSelectedLocation(location)
    setMarkerPosition(null)
  }

  const handleBack = () => {
    setSelectedLocation(null)
    setMarkerPosition(null)
  }

  const handleConfirmMarker = async () => {
    if (!selectedLocation) return
    await setItemLocation({
      data: {
        itemId: parseInt(itemId, 10),
        locationId: selectedLocation.id,
        parentLocationMarker: markerPosition
          ? { id: 1, x: markerPosition.x, y: markerPosition.y }
          : null,
      },
    })
    await navigate({ to: "/i/$itemId", params: { itemId } })
  }

  const handleStartCreate = () => {
    setCreateState({ isCreating: true, name: "", image: "", pending: null })
  }

  const handleCancelCreate = () => {
    setCreateState({ isCreating: false, name: "", image: "", pending: null })
    setMarkerPosition(null)
  }

  const handleProceedToMarker = () => {
    if (!createState.name.trim()) return
    setCreateState({
      ...createState,
      pending: { name: createState.name, image: createState.image },
    })
    setMarkerPosition(null)
  }

  const handleConfirmNewLocation = async () => {
    const name = createState.pending?.name ?? createState.name
    const image = createState.pending?.image ?? createState.image
    if (!name.trim()) return

    const parentLocation =
      locationPath.length > 0 ? locationPath[locationPath.length - 1] : null

    const result = await createLocation({
      data: {
        name,
        image: image || undefined,
        parentId: parentLocation?.id ?? null,
        parentLocationMarker: markerPosition
          ? { id: 1, x: markerPosition.x, y: markerPosition.y }
          : null,
      },
    })

    if (result.success && result.location) {
      addLocation(result.location)
      setCreateState({ isCreating: false, name: "", image: "", pending: null })
      setMarkerPosition(null)
    }
  }

  const handleCancel = () => {
    navigate({ to: "/i/$itemId", params: { itemId } })
  }

  // Render appropriate view based on state
  if (createState.pending && locationPath.length > 0) {
    const parentLocation = locationPath[locationPath.length - 1]
    return (
      <CreateLocationMarkerView
        pendingLocation={createState.pending}
        parentLocation={parentLocation}
        markerPosition={markerPosition}
        imageRef={imageRef}
        onImageClick={handleImageClick}
        onConfirm={handleConfirmNewLocation}
        onCancel={handleCancelCreate}
      />
    )
  }

  if (createState.isCreating) {
    return (
      <CreateLocationForm
        locationPath={locationPath}
        name={createState.name}
        onNameChange={(name) => setCreateState({ ...createState, name })}
        onImageChange={(image) => setCreateState({ ...createState, image })}
        onProceedToMarker={handleProceedToMarker}
        onConfirmCreate={handleConfirmNewLocation}
        onCancel={handleCancelCreate}
      />
    )
  }

  if (selectedLocation) {
    return (
      <MarkerSelectionView
        location={selectedLocation}
        markerPosition={markerPosition}
        imageRef={imageRef}
        onImageClick={handleImageClick}
        onConfirm={handleConfirmMarker}
        onBack={handleBack}
      />
    )
  }

  const handleSelectCurrent = () => {
    if (locationPath.length > 0) {
      handleSelect(locationPath[locationPath.length - 1])
    }
  }

  return (
    <LocationSelectionView
      item={item ?? null}
      currentLocations={currentLocations}
      locationPath={locationPath}
      onLocationClick={navigateToLocation}
      onSelectCurrent={handleSelectCurrent}
      onBreadcrumbClick={navigateToBreadcrumb}
      onStartCreate={handleStartCreate}
      onCancel={handleCancel}
    />
  )
}
