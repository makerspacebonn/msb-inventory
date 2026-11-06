import { describe, expect, it } from "vitest"
import {
  buildReview,
  firstOpen,
  placeMarker,
  type ReviewSource,
  removeMarker,
  toMarkerUpdates,
} from "./markerReview"

const shelf: ReviewSource = {
  key: "l1",
  kind: "location",
  id: 1,
  label: "Regal",
  x: 20,
  y: 30,
}
const drill: ReviewSource = {
  key: "i7",
  kind: "item",
  id: 7,
  label: "Bohrer",
  x: 90,
  y: 50,
}
const shift = ({ x, y }: { x: number; y: number }) => ({ x: x + 20, y })

describe("buildReview", () => {
  it("calculates new positions and keeps the old ones for reference", () => {
    const [marker] = buildReview([shelf], shift)
    expect(marker.old).toEqual({ x: 20, y: 30 })
    expect(marker.position).toEqual({ x: 40, y: 30 })
    expect(marker.removed).toBe(false)
  })

  it("leaves markers outside the new image without a position", () => {
    const [, outside] = buildReview([shelf, drill], shift)
    expect(outside.key).toBe("i7")
    expect(outside.position).toBeNull()
  })

  it("starts at the old positions when placing by hand", () => {
    expect(buildReview([drill], null)[0].position).toEqual({ x: 90, y: 50 })
  })
})

describe("working through the markers", () => {
  const review = buildReview([shelf, drill], shift)

  it("knows which markers still need a decision", () => {
    expect(firstOpen(review)?.key).toBe("i7")
    expect(firstOpen(removeMarker(review, "i7"))).toBeUndefined()
    expect(firstOpen(placeMarker(review, "i7", { x: 5, y: 5 }))).toBeUndefined()
  })

  it("can place a marker again after removing it", () => {
    const placed = placeMarker(removeMarker(review, "l1"), "l1", { x: 1, y: 2 })
    expect(placed[0]).toMatchObject({
      position: { x: 1, y: 2 },
      removed: false,
    })
  })
})

describe("toMarkerUpdates", () => {
  it("sends every marker, with null for removed ones", () => {
    const review = removeMarker(buildReview([shelf, drill], shift), "i7")
    expect(toMarkerUpdates(review)).toEqual([
      { kind: "location", id: 1, marker: { x: 40, y: 30 } },
      { kind: "item", id: 7, marker: null },
    ])
  })
})
