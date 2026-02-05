/**
 * Recent Locations - localStorage utilities for quick-select location chips
 *
 * Stores the last 5 selected locations with their full path for display.
 * Used by the location selection flow to speed up repeated selections.
 */

export type RecentLocation = {
  id: number
  name: string
  path: string // Full path like "Werkstatt → Regal A → Fach 3"
}

export const STORAGE_KEY = "msb-inventory:recent-locations"
export const MAX_RECENT_LOCATIONS = 5

/**
 * Get recent locations from localStorage
 * Returns empty array if localStorage unavailable or invalid data
 */
export function getRecentLocations(): RecentLocation[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    // Validate each entry has required fields
    return parsed.filter(
      (item): item is RecentLocation =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "number" &&
        typeof item.name === "string" &&
        typeof item.path === "string",
    )
  } catch {
    return []
  }
}

/**
 * Save recent locations to localStorage
 * Silently fails if localStorage unavailable
 */
export function saveRecentLocations(locations: RecentLocation[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations))
  } catch {
    // Silent fail - localStorage might be full or disabled
  }
}

/**
 * Add a location to recent locations
 * - Deduplicates (moves existing to front)
 * - Limits to MAX_RECENT_LOCATIONS
 */
export function addRecentLocation(location: RecentLocation): RecentLocation[] {
  const current = getRecentLocations()

  // Remove if already exists (will re-add at front)
  const filtered = current.filter((l) => l.id !== location.id)

  // Add to front, trim to max
  const updated = [location, ...filtered].slice(0, MAX_RECENT_LOCATIONS)

  saveRecentLocations(updated)
  return updated
}

/**
 * Remove a location from recent locations by ID
 */
export function removeRecentLocation(locationId: number): RecentLocation[] {
  const current = getRecentLocations()
  const updated = current.filter((l) => l.id !== locationId)
  saveRecentLocations(updated)
  return updated
}
