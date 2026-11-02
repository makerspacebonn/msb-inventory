import { describe, expect, it } from "vitest"
import {
  MIN_PHOTO_SCORE,
  type PhotoCandidate,
  type PhotoDescription,
  photoSearchTerms,
  rankPhotoMatches,
  scorePhotoMatch,
  toPhotoDescription,
} from "./photoMatch"

const description: PhotoDescription = {
  name: "Akkuschrauber",
  category: "Elektrowerkzeug",
  tags: ["Werkzeug", "Schrauben", "Akku"],
  manufacturer: "Bosch",
  model: "GSR 12V",
}

const candidate = (overrides: Partial<PhotoCandidate>): PhotoCandidate => ({
  category: null,
  tags: [],
  manufacturer: null,
  model: null,
  textRank: 0,
  nameSimilarity: 0,
  ...overrides,
})

describe("toPhotoDescription", () => {
  it("maps the AI answer to the fields used for matching", () => {
    expect(
      toPhotoDescription({
        bezeichnung: " Akkuschrauber ",
        kategorie: "Elektrowerkzeug",
        kategorie_neu: null,
        schlagworte: ["Werkzeug", " ", "Akku"],
        hersteller: "Bosch",
        modell: "",
      }),
    ).toEqual({
      name: "Akkuschrauber",
      category: "Elektrowerkzeug",
      tags: ["Werkzeug", "Akku"],
      manufacturer: "Bosch",
      model: null,
    })
  })

  it("ignores the fallback category when the AI proposes a new one", () => {
    const result = toPhotoDescription({
      bezeichnung: "Theremin",
      kategorie: "Sonstiges",
      kategorie_neu: "Musikinstrumente",
    })
    expect(result.category).toBeNull()
  })
})

describe("photoSearchTerms", () => {
  it("joins name, tags, manufacturer and model with or", () => {
    expect(photoSearchTerms(description)).toBe(
      "Akkuschrauber or Werkzeug or Schrauben or Akku or Bosch or GSR 12V",
    )
  })

  it("removes characters with a meaning in websearch syntax and duplicates", () => {
    expect(
      photoSearchTerms({
        ...description,
        name: 'Step-Up "Wandler"',
        tags: ["DC-DC", "DC-DC"],
        manufacturer: null,
        model: null,
      }),
    ).toBe("Step Up  Wandler or DC DC")
  })
})

describe("scorePhotoMatch", () => {
  it("rewards each matching signal", () => {
    const none = scorePhotoMatch(candidate({}), description)
    expect(none).toBe(0)
    expect(
      scorePhotoMatch(candidate({ category: "elektrowerkzeug" }), description),
    ).toBeGreaterThan(none)
    expect(
      scorePhotoMatch(candidate({ tags: ["akku", "Bohren"] }), description),
    ).toBeGreaterThan(none)
  })

  it("rates a matching model higher than a matching manufacturer", () => {
    expect(
      scorePhotoMatch(candidate({ model: "GSR 12V" }), description),
    ).toBeGreaterThan(
      scorePhotoMatch(candidate({ manufacturer: "Bosch" }), description),
    )
  })
})

describe("rankPhotoMatches", () => {
  it("orders by score, best first, and drops weak matches", () => {
    const strong = { id: 1, ...candidate({ nameSimilarity: 1, textRank: 0.5 }) }
    const medium = {
      id: 2,
      ...candidate({ category: "Elektrowerkzeug", tags: ["Akku"] }),
    }
    const weak = { id: 3, ...candidate({ tags: ["Akku"] }) }

    const ranked = rankPhotoMatches([weak, medium, strong], description)

    expect(ranked.map((r) => r.id)).toEqual([1, 2])
    expect(ranked.every((r) => r.score >= MIN_PHOTO_SCORE)).toBe(true)
  })

  it("returns at most the given number of matches", () => {
    const many = Array.from({ length: 30 }, (_, id) => ({
      id,
      ...candidate({ nameSimilarity: 1 }),
    }))
    expect(rankPhotoMatches(many, description, 5)).toHaveLength(5)
  })
})
