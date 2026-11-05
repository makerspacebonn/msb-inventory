import { describe, expect, it } from "vitest"
import { addTag, addTags, suggestionsFor } from "./tagInput"

describe("addTag", () => {
  it("adds typed text as a new tag", () => {
    expect(addTag(["Akku"], "Schrauben")).toEqual(["Akku", "Schrauben"])
  })

  it("trims and collapses spaces", () => {
    expect(addTag([], "  Bit   Set ")).toEqual(["Bit Set"])
  })

  it("ignores empty text", () => {
    expect(addTag(["Akku"], "   ")).toEqual(["Akku"])
  })

  it("doesn't add a tag the item already has, whatever the case", () => {
    expect(addTag(["Akku"], "akku")).toEqual(["Akku"])
  })

  it("uses the existing spelling of a known tag", () => {
    expect(addTag([], "elektro", ["Werkzeug", "Elektro"])).toEqual(["Elektro"])
  })

  it("keeps umlauts apart from their plain letters", () => {
    expect(addTag(["Säge"], "Sage")).toEqual(["Säge", "Sage"])
  })
})

describe("suggestionsFor", () => {
  it("leaves out tags the item already has", () => {
    expect(suggestionsFor(["Werkzeug", "Akku", "Elektro"], ["akku"])).toEqual([
      "Werkzeug",
      "Elektro",
    ])
  })
})

describe("addTags", () => {
  it("adds the new tags after the existing ones, without duplicates", () => {
    expect(
      addTags(["Akku", "Werkzeug"], ["werkzeug", "Schrauben", "Elektro"]),
    ).toEqual(["Akku", "Werkzeug", "Schrauben", "Elektro"])
  })
})
