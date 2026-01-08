import type { ParentLocationMarker } from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import fs from "fs"
import { v7 as uuidv7 } from "uuid"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { LocationRepository } from "@/src/repositories/LocationRepository"

export const fetchRootLocations = createServerFn().handler(async () => {
  return new LocationRepository().findRootLocations()
})

export const fetchLocationChain = createServerFn()
  .inputValidator((locationId: number) => locationId)
  .handler(async ({ data: locationId }) => {
    const chain = await new LocationRepository().findChainForId(locationId)
    // Chain is returned as [current, parent, grandparent, ...root]
    // We need it as [root, ..., grandparent, parent] (without current)
    return chain.slice(1).reverse()
  })

export const fetchChildLocations = createServerFn()
  .inputValidator((parentId: number | undefined) => parentId)
  .handler(async ({ data: parentId }) => {
    return new LocationRepository().findByParentId(parentId)
  })

export const searchLocations = createServerFn()
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    if (!query.trim()) return []
    const repo = new LocationRepository()
    const locations = await repo.search(query)
    // Get the path for each location
    const locationsWithPath = await Promise.all(
      locations.map(async (location) => {
        const chain = await repo.findChainForId(location.id)
        // Chain is [current, parent, grandparent, ...root], we want path as string
        const path = chain
          .reverse()
          .map((l) => l.name)
          .join(" → ")
        return { ...location, path }
      }),
    )
    return locationsWithPath
  })

function decodeBase64Image(dataString: string) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (matches?.length !== 3) {
    throw new Error("Invalid input string")
  }
  return {
    fileType: matches[1],
    fileBuffer: Buffer.from(matches[2], "base64"),
  }
}

export const createLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator(
    (data: {
      name: string
      image?: string
      parentId: number | null
      parentLocationMarker: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data }) => {
    let imagePath: string | undefined
    if (data.image) {
      const savePath = `${process.env.SAVE_PATH}locations/`
      const { fileType, fileBuffer } = decodeBase64Image(data.image)
      const fileName = uuidv7()
      const fileExtension = fileType?.split("/")[1]
      const filePath = `${savePath}${fileName}.${fileExtension}`
      const fileStream = fs.createWriteStream(filePath)
      fileStream.write(fileBuffer)
      fileStream.end()
      imagePath = `${fileName}.${fileExtension}`
    }
    const location = await new LocationRepository().create({
      name: data.name,
      parentId: data.parentId,
      parentLocationMarker: data.parentLocationMarker,
      imagePath,
    })
    return { success: true, location }
  })
