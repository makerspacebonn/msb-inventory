export type MarkerOwner = { kind: "item" | "location"; id: number }
export type MarkerPosition = { x: number; y: number }

/** A marker on the location's image, as it is stored now */
export type CurrentMarker = MarkerOwner & { marker: MarkerPosition }
/** A marker's new position; null removes the marker */
export type MarkerUpdate = MarkerOwner & { marker: MarkerPosition | null }

export type MarkerPlan =
  | { ok: true; changes: MarkerUpdate[] }
  | { ok: false; problem: "outdated" | "duplicate" }

const keyOf = (owner: MarkerOwner) => `${owner.kind}:${owner.id}`

/**
 * Checks new positions against the markers stored now, and returns those
 * that change. All current markers need a position: the image is replaced
 * for all of them, so one left out would point at the wrong spot. That only
 * happens when someone else changed the location since the page was opened
 */
export function planMarkerUpdates(
  current: CurrentMarker[],
  updates: MarkerUpdate[],
): MarkerPlan {
  const updateKeys = new Set(updates.map(keyOf))
  if (updateKeys.size !== updates.length) {
    return { ok: false, problem: "duplicate" }
  }

  const byKey = new Map(current.map((marker) => [keyOf(marker), marker]))
  const matches =
    updates.length === current.length &&
    updates.every((update) => byKey.has(keyOf(update)))
  if (!matches) return { ok: false, problem: "outdated" }

  return {
    ok: true,
    changes: updates.filter((update) => {
      const before = byKey.get(keyOf(update))?.marker
      return update.marker?.x !== before?.x || update.marker?.y !== before?.y
    }),
  }
}
