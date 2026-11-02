import { describe, expect, it } from "vitest"
import { buildItemPrompt, buildItemResponseSchema } from "./aiItemPrompt"

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
