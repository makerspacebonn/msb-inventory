import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import type { Location } from "../app/types"
import { type LocationInsert, LocationTable } from "../drizzle/schema"

export class LocationRepository {
  async create(location: LocationInsert): Promise<Location> {
    const result = await db.insert(LocationTable).values(location).returning()
    return result[0]
  }

  async update(
    id: number,
    data: Partial<LocationInsert>,
  ): Promise<Location | undefined> {
    const result = await db
      .update(LocationTable)
      .set(data)
      .where(eq(LocationTable.id, id))
      .returning()
    return result[0]
  }

  async findRootLocations(): Promise<Location[]> {
    return this.findByParentId(null)
  }

  async findByParentId(
    parentId: number | undefined | null,
  ): Promise<Location[]> {
    if (typeof parentId === "undefined" || parentId === null) {
      return await db.query.LocationTable.findMany({
        where: (locations, { isNull }) => isNull(locations.parentId),
      })
    } else
      return await db.query.LocationTable.findMany({
        where: (locations, { eq }) => eq(locations.parentId, parentId),
      })
  }

  async findById(id: number): Promise<Location | undefined> {
    return await db.query.LocationTable.findFirst({
      where: (locations, { eq }) => eq(locations.id, id),
    })
  }

  async findChainForId(locationId: number) {
    const locations: Location[] = []
    const locationsResult = await db.query.LocationTable.findMany({
      where: (locations, { eq }) => eq(locations.id, locationId),
    })
    if (locationsResult.length > 0) {
      locations.push(locationsResult[0])
      if (locationsResult[0].parentId) {
        locations.push(
          ...(await this.findChainForId(locationsResult[0].parentId)),
        )
      }
    }
    return locations
  }
}
