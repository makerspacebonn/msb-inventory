import type { ParentLocationMarker } from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import fs from "fs"
import { v7 as uuidv7 } from "uuid"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { ChangelogRepository } from "@/src/repositories/ChangelogRepository"
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
  .handler(async ({ data, context }) => {
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

    // Log to changelog
    await new ChangelogRepository().create({
      entityType: "location",
      entityId: location.id,
      changeType: "create",
      userId: context.userId,
      beforeValues: null,
      afterValues: location as unknown as Record<string, unknown>,
      changedFields: ["name", "parentId", "parentLocationMarker", "imagePath"].filter(
        (field) => data[field as keyof typeof data] !== undefined
      ),
    })

    return { success: true, location }
  })

export const updateLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator(
    (data: {
      id: number
      name?: string
      description?: string
      image?: string
      parentId?: number | null
      parentLocationMarker?: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const locationRepo = new LocationRepository()
    const beforeLocation = await locationRepo.findById(data.id)

    if (!beforeLocation) {
      return { success: false, message: "Location not found" }
    }

    // Determine which fields changed
    const changedFields: string[] = []
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined && data.name !== beforeLocation.name) {
      changedFields.push("name")
      updateData.name = data.name
    }
    if (data.description !== undefined && data.description !== beforeLocation.description) {
      changedFields.push("description")
      updateData.description = data.description
    }
    if (data.parentId !== undefined && data.parentId !== beforeLocation.parentId) {
      changedFields.push("parentId")
      updateData.parentId = data.parentId
    }
    if (
      data.parentLocationMarker !== undefined &&
      JSON.stringify(data.parentLocationMarker) !==
        JSON.stringify(beforeLocation.parentLocationMarker)
    ) {
      changedFields.push("parentLocationMarker")
      updateData.parentLocationMarker = data.parentLocationMarker
    }

    // Handle image upload
    if (data.image) {
      const savePath = `${process.env.SAVE_PATH}locations/`
      const { fileType, fileBuffer } = decodeBase64Image(data.image)
      const fileName = uuidv7()
      const fileExtension = fileType?.split("/")[1]
      const filePath = `${savePath}${fileName}.${fileExtension}`
      const fileStream = fs.createWriteStream(filePath)
      fileStream.write(fileBuffer)
      fileStream.end()
      updateData.imagePath = `${fileName}.${fileExtension}`
      changedFields.push("imagePath")

      // Delete old image if it exists
      if (beforeLocation.imagePath) {
        const oldPath = `${process.env.SAVE_PATH}locations/${beforeLocation.imagePath}`
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath)
        }
      }
    }

    if (changedFields.length === 0) {
      return { success: true, location: beforeLocation, message: "No changes" }
    }

    const updatedLocation = await locationRepo.update(data.id, updateData)

    // Log to changelog
    await new ChangelogRepository().create({
      entityType: "location",
      entityId: data.id,
      changeType: "update",
      userId: context.userId,
      beforeValues: beforeLocation as unknown as Record<string, unknown>,
      afterValues: updatedLocation as unknown as Record<string, unknown>,
      changedFields,
    })

    return { success: true, location: updatedLocation }
  })

export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .inputValidator((locationId: number) => locationId)
  .handler(async ({ data: locationId, context }) => {
    const locationRepo = new LocationRepository()
    const location = await locationRepo.findById(locationId)

    if (!location) {
      return { success: false, message: "Location not found" }
    }

    // Store full location state before deletion
    const beforeValues = { ...location } as unknown as Record<string, unknown>

    // Delete the location
    const deleted = await locationRepo.delete(locationId)

    if (deleted) {
      // Log to changelog
      await new ChangelogRepository().create({
        entityType: "location",
        entityId: locationId,
        changeType: "delete",
        userId: context.userId,
        beforeValues,
        afterValues: null,
        changedFields: Object.keys(beforeValues),
      })

      // Delete the image file if it exists
      if (location.imagePath) {
        const imagePath = `${process.env.SAVE_PATH}locations/${location.imagePath}`
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath)
        }
      }
    }

    return { success: deleted }
  })
