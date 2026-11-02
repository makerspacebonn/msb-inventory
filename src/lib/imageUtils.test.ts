import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { deleteImage, parseImageDataUrl, storeImage } from "./imageUtils"

const fakeImage = Buffer.from("fake-image").toString("base64")

describe("parseImageDataUrl", () => {
  it("maps allowed image types to a fixed extension", () => {
    const result = parseImageDataUrl(`data:image/jpeg;base64,${fakeImage}`)
    expect(result.extension).toBe("jpg")
    expect(result.buffer.toString()).toBe("fake-image")
    expect(
      parseImageDataUrl(`data:image/webp;base64,${fakeImage}`).extension,
    ).toBe("webp")
  })

  it("rejects non-image types so they cannot be stored with their extension", () => {
    expect(() =>
      parseImageDataUrl(`data:text/html;base64,${fakeImage}`),
    ).toThrow("text/html")
    expect(() =>
      parseImageDataUrl(`data:image/svg+xml;base64,${fakeImage}`),
    ).toThrow("image/svg+xml")
  })

  it("rejects strings that are not base64 data URLs", () => {
    expect(() => parseImageDataUrl("items/foo.jpg")).toThrow(
      "Ungültiges Bildformat",
    )
  })
})

describe("storeImage and deleteImage", () => {
  let saveDir: string
  const originalSavePath = process.env.SAVE_PATH

  beforeEach(() => {
    saveDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-images-"))
    process.env.SAVE_PATH = saveDir
  })

  afterEach(() => {
    process.env.SAVE_PATH = originalSavePath
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  it("writes the image into its folder, creating the folder if needed", async () => {
    const fileName = await storeImage(
      `data:image/png;base64,${fakeImage}`,
      "locations",
    )
    expect(fileName).toMatch(/\.png$/)
    const stored = path.join(saveDir, "locations", fileName)
    expect(fs.readFileSync(stored, "utf8")).toBe("fake-image")
  })

  it("writes nothing for a rejected image type", async () => {
    await expect(
      storeImage(`data:text/html;base64,${fakeImage}`, "items"),
    ).rejects.toThrow("text/html")
    expect(fs.existsSync(path.join(saveDir, "items"))).toBe(false)
  })

  it("deletes a stored image and ignores one that is already gone", async () => {
    const fileName = await storeImage(
      `data:image/jpeg;base64,${fakeImage}`,
      "items",
    )
    await deleteImage(fileName, "items")
    expect(fs.existsSync(path.join(saveDir, "items", fileName))).toBe(false)
    await expect(deleteImage(fileName, "items")).resolves.toBeUndefined()
  })

  it("never deletes outside the image folder", async () => {
    const outside = path.join(saveDir, "keep.txt")
    fs.writeFileSync(outside, "keep")
    await deleteImage("../keep.txt", "items")
    expect(fs.existsSync(outside)).toBe(true)
  })
})
