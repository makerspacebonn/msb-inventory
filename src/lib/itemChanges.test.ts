import { describe, expect, it } from "vitest"
import { diffFields, parseImageDataUrl } from "./itemChanges"

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

describe("parseImageDataUrl", () => {
  const pixel = Buffer.from("fake-image").toString("base64")

  it("maps allowed image types to a fixed extension", () => {
    const result = parseImageDataUrl(`data:image/jpeg;base64,${pixel}`)
    expect(result.extension).toBe("jpg")
    expect(result.buffer.toString()).toBe("fake-image")
    expect(parseImageDataUrl(`data:image/webp;base64,${pixel}`).extension).toBe(
      "webp",
    )
  })

  it("rejects non-image types so they cannot be stored with their extension", () => {
    expect(() => parseImageDataUrl(`data:text/html;base64,${pixel}`)).toThrow(
      "text/html",
    )
    expect(() =>
      parseImageDataUrl(`data:image/svg+xml;base64,${pixel}`),
    ).toThrow("image/svg+xml")
  })

  it("rejects strings that are not base64 data URLs", () => {
    expect(() => parseImageDataUrl("items/foo.jpg")).toThrow(
      "Ungültiges Bildformat",
    )
  })
})
