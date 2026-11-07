import { describe, expect, it } from "vitest"
import {
  buildItemPrompt,
  buildItemResponseSchema,
  imageParts,
} from "./aiItemPrompt"

describe("buildItemPrompt", () => {
  it("includes the tag vocabulary and forbids colors and materials", () => {
    const prompt = buildItemPrompt({
      categories: ["Messtechnik"],
      topTags: ["Arduino", "I2C"],
    })
    expect(prompt).toContain("Arduino, I2C")
    expect(prompt).toContain("Farben und Materialien")
    expect(prompt).not.toContain('"Blau"')
  })
})

describe("buildItemResponseSchema", () => {
  it("restricts the category to the existing list", () => {
    const schema = buildItemResponseSchema(["Messtechnik", "Löten"])
    expect(schema.properties?.kategorie).toMatchObject({
      format: "enum",
      enum: ["Messtechnik", "Löten"],
    })
  })

  it("allows any category when the list is empty", () => {
    const schema = buildItemResponseSchema([])
    expect(schema.properties?.kategorie).not.toHaveProperty("enum")
  })
})

describe("several pictures", () => {
  it("tells the AI that all pictures show the same item", () => {
    const prompt = buildItemPrompt({
      categories: [],
      topTags: [],
      pictureCount: 3,
    })
    expect(prompt).toContain("diese 3 Bilder")
    expect(prompt).toContain("denselben Gegenstand")
  })

  it("speaks of one picture by default", () => {
    expect(buildItemPrompt({ categories: [], topTags: [] })).toContain(
      "dieses Bild",
    )
  })

  it("sends every picture with its own format", () => {
    expect(
      imageParts(["data:image/png;base64,AAA", "data:image/jpeg;base64,BBB"]),
    ).toEqual([
      { inlineData: { data: "AAA", mimeType: "image/png" } },
      { inlineData: { data: "BBB", mimeType: "image/jpeg" } },
    ])
  })
})
