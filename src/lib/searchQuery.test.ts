import { describe, expect, it } from "vitest"
import {
  buildSearchQuery,
  categoryPatternToLike,
  categorySearchTerm,
  parseSearchQuery,
} from "./searchQuery"

describe("parseSearchQuery", () => {
  it("keeps a query without category filters as text", () => {
    expect(parseSearchQuery("Bohrmaschine Makita")).toEqual({
      text: "Bohrmaschine Makita",
      categories: [],
    })
  })

  it("reads a quoted category, including spaces", () => {
    expect(parseSearchQuery('cat:"3D Druck"')).toEqual({
      text: "",
      categories: ["3D Druck"],
    })
  })

  it("reads an unquoted category up to the next space", () => {
    expect(parseSearchQuery("cat:Elektro* akku")).toEqual({
      text: "akku",
      categories: ["Elektro*"],
    })
  })

  it("separates category filters from free text anywhere in the query", () => {
    expect(
      parseSearchQuery('akku cat:"Elektrowerkzeug" bosch CAT:Messtechnik'),
    ).toEqual({
      text: "akku bosch",
      categories: ["Elektrowerkzeug", "Messtechnik"],
    })
  })

  it("ignores empty category filters", () => {
    expect(parseSearchQuery('cat:"" bohrer')).toEqual({
      text: "bohrer",
      categories: [],
    })
  })

  it("only treats cat: at the start of a word as a filter", () => {
    expect(parseSearchQuery("bobcat:x")).toEqual({
      text: "bobcat:x",
      categories: [],
    })
  })
})

describe("buildSearchQuery", () => {
  it("round-trips through parseSearchQuery", () => {
    const parsed = { text: "akku", categories: ["Elektrowerkzeug", "3D*"] }
    const query = buildSearchQuery(parsed)
    expect(query).toBe('cat:"Elektrowerkzeug" cat:"3D*" akku')
    expect(parseSearchQuery(query)).toEqual(parsed)
  })

  it("builds the term a category link searches for", () => {
    expect(categorySearchTerm("3D-Druck")).toBe('cat:"3D-Druck"')
  })
})

describe("categoryPatternToLike", () => {
  it("turns * into a wildcard", () => {
    expect(categoryPatternToLike("Elektro*")).toBe("Elektro%")
    expect(categoryPatternToLike("*technik")).toBe("%technik")
  })

  it("matches LIKE's special characters literally", () => {
    expect(categoryPatternToLike("100%_sicher\\")).toBe("100\\%\\_sicher\\\\")
  })
})
