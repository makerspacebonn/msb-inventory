import { type Point, type Transform, transferMarkers } from "./markerTransform"
import type { MarkerOwner, MarkerUpdate } from "./markerUpdates"

export type ReviewSource = MarkerOwner & Point & { key: string; label: string }

/** A marker during an image replacement: where it was, and where it goes */
export type ReviewMarker = MarkerOwner & {
  key: string
  label: string
  old: Point
  /** On the new image; null while it has no place yet, or when it's removed */
  position: Point | null
  removed: boolean
}

/**
 * The starting point of the check: calculated positions, or the old ones
 * when placing by hand. Markers outside the new image have no position yet
 */
export function buildReview(
  sources: ReviewSource[],
  transform: Transform | null,
): ReviewMarker[] {
  const { placed } = transform
    ? transferMarkers(sources, transform)
    : { placed: sources }
  const positions = new Map(placed.map((m) => [m.key, { x: m.x, y: m.y }]))

  return sources.map(({ key, kind, id, label, x, y }) => ({
    key,
    kind,
    id,
    label,
    old: { x, y },
    position: positions.get(key) ?? null,
    removed: false,
  }))
}

export function placeMarker(
  markers: ReviewMarker[],
  key: string,
  position: Point,
): ReviewMarker[] {
  return markers.map((marker) =>
    marker.key === key ? { ...marker, position, removed: false } : marker,
  )
}

export function removeMarker(
  markers: ReviewMarker[],
  key: string,
): ReviewMarker[] {
  return markers.map((marker) =>
    marker.key === key ? { ...marker, position: null, removed: true } : marker,
  )
}

/** The next marker the user still has to decide on; none means ready to save */
export function firstOpen(markers: ReviewMarker[]): ReviewMarker | undefined {
  return markers.find((marker) => !marker.position && !marker.removed)
}

export function toMarkerUpdates(markers: ReviewMarker[]): MarkerUpdate[] {
  return markers.map(({ kind, id, position }) => ({
    kind,
    id,
    marker: position,
  }))
}
