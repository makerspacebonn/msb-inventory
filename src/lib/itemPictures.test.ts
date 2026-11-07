import { describe, expect, it } from "vitest"
import { AppError } from "./errors"
import {
  imageMimeType,
  isImageFileName,
  MAX_ITEM_PICTURES,
  picturePaths,
  resolvePictures,
} from "./itemPictures"

/** Stores uploads under numbered names, remembering what it stored */
function fakeStore() {
  const stored: string[] = []
  return {
    stored,
    store: async (dataUrl: string) => {
      stored.push(dataUrl)
      return `new-${stored.length}.jpg`
    },
  }
}

describe("picturePaths", () => {
  it("lists the main picture first, then the others in order", () => {
    expect(
      picturePaths({ imagePath: "a.jpg", extraImagePaths: ["b.jpg", "c.jpg"] }),
    ).toEqual(["a.jpg", "b.jpg", "c.jpg"])
  })

  it("is empty for an item without pictures", () => {
    expect(picturePaths({ imagePath: null, extraImagePaths: [] })).toEqual([])
  })
})

describe("resolvePictures", () => {
  it("keeps the given order, so the first picture becomes the main one", async () => {
    const { store } = fakeStore()

    expect(
      await resolvePictures(
        [{ path: "b.jpg" }, { path: "a.jpg" }],
        ["a.jpg", "b.jpg"],
        store,
      ),
    ).toEqual({ imagePath: "b.jpg", extraImagePaths: ["a.jpg"] })
  })

  it("stores new pictures in their place among the kept ones", async () => {
    const { store, stored } = fakeStore()

    const result = await resolvePictures(
      [{ path: "a.jpg" }, { upload: "data:one" }, { upload: "data:two" }],
      ["a.jpg"],
      store,
    )

    expect(result).toEqual({
      imagePath: "a.jpg",
      extraImagePaths: ["new-1.jpg", "new-2.jpg"],
    })
    expect(stored).toEqual(["data:one", "data:two"])
  })

  it("leaves out removed pictures, and clears the main one when none are left", async () => {
    const { store } = fakeStore()

    expect(await resolvePictures([], ["a.jpg", "b.jpg"], store)).toEqual({
      imagePath: null,
      extraImagePaths: [],
    })
  })

  it("refuses files that aren't the item's own, before storing anything", async () => {
    const { store, stored } = fakeStore()

    await expect(
      resolvePictures(
        [{ upload: "data:one" }, { path: "other-item.jpg" }],
        ["a.jpg"],
        store,
      ),
    ).rejects.toThrow(AppError)
    expect(stored).toEqual([])
  })

  it("refuses more pictures than allowed", async () => {
    const { store } = fakeStore()
    const pictures = Array.from({ length: MAX_ITEM_PICTURES + 1 }, () => ({
      upload: "data:x",
    }))

    await expect(resolvePictures(pictures, [], store)).rejects.toThrow(
      `höchstens ${MAX_ITEM_PICTURES} Bilder`,
    )
  })
})

describe("isImageFileName", () => {
  it("accepts stored file names and nothing that leaves the folder", () => {
    expect(isImageFileName("3f2a-91c0.jpg")).toBe(true)
    expect(isImageFileName("Alte Bohrmaschine.JPG")).toBe(true)
    expect(isImageFileName("../secrets.jpg")).toBe(false)
    expect(isImageFileName("..")).toBe(false)
    expect(isImageFileName("sub\\a.jpg")).toBe(false)
    expect(isImageFileName("")).toBe(false)
  })
})

describe("imageMimeType", () => {
  it("names the format of a stored image by its extension", () => {
    expect(imageMimeType("a.png")).toBe("image/png")
    expect(imageMimeType("a.WEBP")).toBe("image/webp")
    expect(imageMimeType("a.jpg")).toBe("image/jpeg")
  })
})
