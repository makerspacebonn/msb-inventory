import { describe, expect, it } from "vitest"
import { buildCanonicalSpellings, cleanTags, isStopTag } from "./tagRules"

describe("isStopTag", () => {
  it("matches colors, materials and generic words case-insensitively", () => {
    expect(isStopTag("Schwarz")).toBe(true)
    expect(isStopTag(" metall ")).toBe(true)
    expect(isStopTag("DIY")).toBe(true)
    expect(isStopTag("Elektronikzubehör")).toBe(true)
    expect(isStopTag("Elektronikkabel")).toBe(false)
    expect(isStopTag("Arduino")).toBe(false)
  })
})

describe("buildCanonicalSpellings", () => {
  it("picks the most used spelling per tag", () => {
    const canonical = buildCanonicalSpellings([
      "E-Block",
      "E-BLOCK",
      "E-Block",
      "Dupont",
    ])
    expect(canonical.get("e-block")).toBe("E-Block")
    expect(canonical.get("dupont")).toBe("Dupont")
  })
})

describe("cleanTags", () => {
  it("removes stop tags and tags that repeat other fields", () => {
    expect(
      cleanTags(["Werkzeug", "Blau", "Makita", "Akku", "Bohren"], {
        redundant: ["Elektrowerkzeug", "Makita"],
      }),
    ).toEqual(["Akku", "Bohren"])
  })

  it("unifies spellings and drops duplicates, keeping order", () => {
    const canonical = new Map([["e-block", "E-Block"]])
    expect(
      cleanTags(["E-BLOCK", "Sensor", "e-block", " Sensor "], { canonical }),
    ).toEqual(["E-Block", "Sensor"])
  })
})
