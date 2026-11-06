import { describe, expect, it } from "vitest"
import { type CurrentMarker, planMarkerUpdates } from "./markerUpdates"

const shelf: CurrentMarker = {
  kind: "location",
  id: 1,
  marker: { x: 10, y: 20 },
}
const drill: CurrentMarker = { kind: "item", id: 1, marker: { x: 30, y: 40 } }

describe("planMarkerUpdates", () => {
  it("returns the markers that really change", () => {
    const moved = { ...drill, marker: { x: 35, y: 45 } }
    expect(planMarkerUpdates([shelf, drill], [shelf, moved])).toEqual({
      ok: true,
      changes: [moved],
    })
  })

  it("treats removing a marker as a change", () => {
    const removed = { ...drill, marker: null }
    expect(planMarkerUpdates([drill], [removed])).toEqual({
      ok: true,
      changes: [removed],
    })
  })

  it("allows a location without markers", () => {
    expect(planMarkerUpdates([], [])).toEqual({ ok: true, changes: [] })
  })

  it("tells a sublocation and an item with the same id apart", () => {
    expect(planMarkerUpdates([shelf, drill], [shelf, drill])).toEqual({
      ok: true,
      changes: [],
    })
  })

  it("rejects a marker added since the page was opened, as it would stay at its old spot", () => {
    expect(planMarkerUpdates([shelf, drill], [shelf])).toEqual({
      ok: false,
      problem: "outdated",
    })
  })

  it("rejects something that has left this location in the meantime", () => {
    expect(planMarkerUpdates([shelf], [shelf, drill])).toEqual({
      ok: false,
      problem: "outdated",
    })
  })

  it("rejects the same record twice, as undo expects one entry per record", () => {
    expect(planMarkerUpdates([drill], [drill, drill])).toEqual({
      ok: false,
      problem: "duplicate",
    })
  })
})
