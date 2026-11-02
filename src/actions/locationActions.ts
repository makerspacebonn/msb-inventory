import type { Item, Location, ParentLocationMarker } from "@server/app/types"
import { createServerFn } from "@tanstack/react-start"
import { isSameValue } from "@/src/lib/changelogUtils"
import { deleteImage, storeImage } from "@/src/lib/imageUtils"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"
import { recordChange } from "@/src/repositories/ChangelogRepository"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"

export const fetchRootLocations = createServerFn().handler(async () => {
  return new LocationRepository().findRootLocations()
})

export const fetchLocationById = createServerFn()
  .validator((locationId: number) => locationId)
  .handler(async ({ data: locationId }) => {
    return new LocationRepository().findById(locationId)
  })

export const fetchLocationChain = createServerFn()
  .validator((locationId: number) => locationId)
  .handler(async ({ data: locationId }) => {
    const chain = await new LocationRepository().findChainForId(locationId)
    // Chain is returned as [current, parent, grandparent, ...root]
    // We need it as [root, ..., grandparent, parent] (without current)
    return chain.slice(1).reverse()
  })

export const fetchChildLocations = createServerFn()
  .validator((parentId: number | undefined) => parentId)
  .handler(async ({ data: parentId }) => {
    return new LocationRepository().findByParentId(parentId)
  })

// Everything needed to render one location level: the location itself,
// its full path (root → current), its sublocations and its items.
// Without a locationId (or for an unknown one) the root level is returned.
export const fetchLocationView = createServerFn()
  .validator((locationId: number | undefined) => locationId)
  .handler(async ({ data: locationId }) => {
    const locationRepo = new LocationRepository()
    const rootView = async () => ({
      currentLocation: null,
      locationPath: [] as Location[],
      childLocations: await locationRepo.findRootLocations(),
      items: [] as Item[],
    })

    if (locationId === undefined) return rootView()

    const currentLocation = await locationRepo.findById(locationId)
    if (!currentLocation) return rootView()

    const [locationChain, childLocations, items] = await Promise.all([
      locationRepo.findChainForId(locationId),
      locationRepo.findByParentId(locationId),
      new ItemRepository().findByLocationId(locationId),
    ])

    return {
      currentLocation,
      locationPath: locationChain.reverse(),
      childLocations,
      items,
    }
  })

export const searchLocations = createServerFn()
  .validator((query: string) => query)
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

export const createLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator(
    (data: {
      name: string
      description?: string
      image?: string
      parentId: number | null
      parentLocationMarker: ParentLocationMarker | null
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const imagePath = data.image
      ? await storeImage(data.image, "locations")
      : undefined
    const location = await new LocationRepository().create({
      name: data.name.trim(),
      // An empty description is stored as "no description"
      description: data.description?.trim() || null,
      parentId: data.parentId,
      parentLocationMarker: data.parentLocationMarker,
      imagePath,
    })

    // Log to changelog
    await recordChange({
      entityType: "location",
      entityId: location.id,
      changeType: "create",
      userId: context.userId,
      before: null,
      after: location,
      changedFields: [
        "name",
        "parentId",
        "parentLocationMarker",
        "imagePath",
      ].filter((field) => data[field as keyof typeof data] !== undefined),
    })

    return { success: true, location }
  })

export const updateLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator(
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

    const name = data.name?.trim()
    if (data.name !== undefined && !name) {
      return { success: false, message: "Der Name darf nicht leer sein" }
    }
    // An empty description is stored as "no description"
    const description =
      data.description === undefined
        ? undefined
        : data.description.trim() || null

    const isMove =
      data.parentId !== undefined && data.parentId !== beforeLocation.parentId
    if (isMove && data.parentId != null) {
      // The new parent's chain must not contain the location itself,
      // otherwise the hierarchy would become a cycle
      const parentChain = await locationRepo.findChainForId(data.parentId)
      if (parentChain.length === 0) {
        return { success: false, message: "Ziel-Location existiert nicht" }
      }
      if (parentChain.some((location) => location.id === data.id)) {
        return {
          success: false,
          message:
            "Eine Location kann nicht in sich selbst oder einen ihrer Unterorte verschoben werden",
        }
      }
    }

    // Determine which fields changed
    const changedFields: string[] = []
    const updateData: Record<string, unknown> = {}

    if (name !== undefined && name !== beforeLocation.name) {
      changedFields.push("name")
      updateData.name = name
    }
    if (
      description !== undefined &&
      description !== beforeLocation.description
    ) {
      changedFields.push("description")
      updateData.description = description
    }
    if (isMove) {
      changedFields.push("parentId")
      updateData.parentId = data.parentId
    }
    if (
      data.parentLocationMarker !== undefined &&
      !isSameValue(
        data.parentLocationMarker,
        beforeLocation.parentLocationMarker,
      )
    ) {
      changedFields.push("parentLocationMarker")
      updateData.parentLocationMarker = data.parentLocationMarker
    }

    // Handle image upload
    if (data.image) {
      updateData.imagePath = await storeImage(data.image, "locations")
      changedFields.push("imagePath")

      if (beforeLocation.imagePath) {
        await deleteImage(beforeLocation.imagePath, "locations")
      }
    }

    if (changedFields.length === 0) {
      return { success: true, location: beforeLocation, message: "No changes" }
    }

    const updatedLocation = await locationRepo.update(data.id, updateData)

    // Log to changelog
    await recordChange({
      entityType: "location",
      entityId: data.id,
      changeType: "update",
      userId: context.userId,
      before: beforeLocation,
      after: updatedLocation,
      changedFields,
    })

    return { success: true, location: updatedLocation }
  })

export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([authGuardMiddleware])
  .validator((locationId: number) => locationId)
  .handler(async ({ data: locationId, context }) => {
    const locationRepo = new LocationRepository()
    const location = await locationRepo.findById(locationId)

    if (!location) {
      return { success: false, message: "Location not found" }
    }

    // Delete the location
    const deleted = await locationRepo.delete(locationId)

    if (deleted) {
      // Log to changelog
      await recordChange({
        entityType: "location",
        entityId: locationId,
        changeType: "delete",
        userId: context.userId,
        before: location,
        after: null,
        changedFields: Object.keys(location),
      })

      // Delete the image file if it exists
      if (location.imagePath) {
        await deleteImage(location.imagePath, "locations")
      }
    }

    return { success: deleted }
  })
