import { describe, expect, it } from "vitest"
import {
  buildSearchQuery,
  categorySearchTerm,
  narrowingTags,
  parseSearchQuery,
  patternToLike,
  tagSearchTerm,
} from "./searchQuery"

describe("parseSearchQuery", () => {
  it("keeps a query without category filters as text", () => {
    expect(parseSearchQuery("Bohrmaschine Makita")).toEqual({
      text: "Bohrmaschine Makita",
      categories: [],
      tags: [],
    })
  })

  it("reads a quoted category, including spaces", () => {
    expect(parseSearchQuery('cat:"3D Druck"')).toEqual({
      text: "",
      categories: ["3D Druck"],
      tags: [],
    })
  })

  it("reads an unquoted category up to the next space", () => {
    expect(parseSearchQuery("cat:Elektro* akku")).toEqual({
      text: "akku",
      categories: ["Elektro*"],
      tags: [],
    })
  })

  it("separates category filters from free text anywhere in the query", () => {
    expect(
      parseSearchQuery('akku cat:"Elektrowerkzeug" bosch CAT:Messtechnik'),
    ).toEqual({
      text: "akku bosch",
      categories: ["Elektrowerkzeug", "Messtechnik"],
      tags: [],
    })
  })

  it("ignores empty category filters", () => {
    expect(parseSearchQuery('cat:"" bohrer')).toEqual({
      text: "bohrer",
      categories: [],
      tags: [],
    })
  })

  it("only treats cat: at the start of a word as a filter", () => {
    expect(parseSearchQuery("bobcat:x")).toEqual({
      text: "bobcat:x",
      categories: [],
      tags: [],
    })
  })
})

describe("parseSearchQuery with tags", () => {
  it("reads tag filters next to categories and text", () => {
    expect(
      parseSearchQuery('tag:"Akku Pack" cat:Elektro* bosch TAG:Schrauben'),
    ).toEqual({
      text: "bosch",
      categories: ["Elektro*"],
      tags: ["Akku Pack", "Schrauben"],
    })
  })
})

describe("buildSearchQuery", () => {
  it("round-trips through parseSearchQuery", () => {
    const parsed = {
      text: "akku",
      categories: ["Elektrowerkzeug", "3D*"],
      tags: ["Bohren", "Elektro"],
    }
    const query = buildSearchQuery(parsed)
    expect(query).toBe(
      'cat:"Elektrowerkzeug" cat:"3D*" tag:"Bohren" tag:"Elektro" akku',
    )
    expect(parseSearchQuery(query)).toEqual(parsed)
  })

  it("builds the terms category and tag links search for", () => {
    expect(categorySearchTerm("3D-Druck")).toBe('cat:"3D-Druck"')
    expect(tagSearchTerm("Löten")).toBe('tag:"Löten"')
  })
})

describe("patternToLike", () => {
  it("turns * into a wildcard", () => {
    expect(patternToLike("Elektro*")).toBe("Elektro%")
    expect(patternToLike("*technik")).toBe("%technik")
  })

  it("matches LIKE's special characters literally", () => {
    expect(patternToLike("100%_sicher\\")).toBe("100\\%\\_sicher\\\\")
  })
})

describe("narrowingTags", () => {
  const results = [
    { tags: ["Werkzeug", "Elektro", "Schrauben"] },
    { tags: ["Hardware", "Schrauben"] },
    { tags: ["Werkzeug", "Bohren", "Schrauben"] },
    { tags: null },
  ]

  it("offers the most frequent tags first, then alphabetically", () => {
    expect(narrowingTags(results, [])).toEqual([
      "Schrauben",
      "Werkzeug",
      "Bohren",
      "Elektro",
      "Hardware",
    ])
  })

  it("leaves out active tag filters, ignoring case", () => {
    expect(narrowingTags(results, ["schrauben"])).not.toContain("Schrauben")
  })

  it("leaves out tags every result has, since they narrow nothing", () => {
    const allTagged = [{ tags: ["A", "B"] }, { tags: ["a", "C"] }]
    expect(narrowingTags(allTagged, [])).toEqual(["B", "C"])
  })

  it("returns at most the given number of tags", () => {
    expect(narrowingTags(results, [], 2)).toEqual(["Schrauben", "Werkzeug"])
  })
})
