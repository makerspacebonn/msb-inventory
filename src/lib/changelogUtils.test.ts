import { describe, expect, it } from "vitest"
import { diffFields, isSameValue } from "./changelogUtils"

describe("isSameValue", () => {
  it("compares arrays and objects by content, not identity", () => {
    expect(isSameValue({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true)
    expect(isSameValue(["a"], ["a"])).toBe(true)
    expect(isSameValue({ x: 1 }, { x: 2 })).toBe(false)
  })

  it("tells null and a missing value apart from real values", () => {
    expect(isSameValue(null, null)).toBe(true)
    expect(isSameValue(null, 0)).toBe(false)
  })
})

describe("diffFields", () => {
  const before = {
    name: "Lötkolben",
    tags: ["löten"],
    locationId: 3 as number | null,
    links: [{ url: "https://a", name: "A", type: "manual" }],
  }

  it("reports only the keys whose values changed", () => {
    const after = { ...before, name: "Lötstation", locationId: null }
    expect(diffFields(before, after, Object.keys(before))).toEqual([
      "name",
      "locationId",
    ])
  })

  it("compares arrays and objects by content, not identity", () => {
    const after = {
      ...before,
      tags: ["löten"],
      links: [{ url: "https://a", name: "A", type: "manual" }],
    }
    expect(diffFields(before, after, Object.keys(before))).toEqual([])
  })

  it("only considers the requested keys", () => {
    const after = { ...before, name: "Lötstation", tags: ["neu"] }
    expect(diffFields(before, after, ["tags"])).toEqual(["tags"])
  })
})
