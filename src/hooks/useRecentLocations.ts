import { useCallback, useEffect, useState } from "react"
import {
  addRecentLocation as addToStorage,
  getRecentLocations,
  type RecentLocation,
  removeRecentLocation as removeFromStorage,
} from "@/lib/recent-locations"

/**
 * React hook for managing recent locations with SSR-safe loading
 *
 * Returns:
 * - recentLocations: Array of recent locations (empty until loaded)
 * - isLoaded: Whether localStorage has been read (prevents hydration mismatch)
 * - addRecentLocation: Add a location to recent list
 * - removeRecentLocation: Remove a location by ID
 */
export function useRecentLocations() {
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    setRecentLocations(getRecentLocations())
    setIsLoaded(true)
  }, [])

  const addRecentLocation = useCallback((location: RecentLocation) => {
    const updated = addToStorage(location)
    setRecentLocations(updated)
  }, [])

  const removeRecentLocation = useCallback((locationId: number) => {
    const updated = removeFromStorage(locationId)
    setRecentLocations(updated)
  }, [])

  return {
    recentLocations,
    isLoaded,
    addRecentLocation,
    removeRecentLocation,
  }
}
