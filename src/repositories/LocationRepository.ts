import { eq, ilike, sql } from "drizzle-orm"
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
    if (parentId == null) {
      return db.query.LocationTable.findMany({
        where: (locations, { isNull }) => isNull(locations.parentId),
      })
    }
    return db.query.LocationTable.findMany({
      where: (locations, { eq }) => eq(locations.parentId, parentId),
    })
  }

  async findById(id: number): Promise<Location | undefined> {
    return db.query.LocationTable.findFirst({
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

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(LocationTable)
      .where(eq(LocationTable.id, id))
      .returning()
    return result.length > 0
  }

  /**
   * Restore a deleted location with its original ID.
   * Uses OVERRIDING SYSTEM VALUE since LocationTable uses generatedAlwaysAsIdentity.
   */
  async restore(location: Partial<Location> & { id: number }): Promise<Location | null> {
    const result = await db.execute(sql`
      INSERT INTO locations (id, name, description, parent_id, "parentLocationMarker", image_path, "additionalInfo")
      OVERRIDING SYSTEM VALUE
      VALUES (
        ${location.id},
        ${location.name},
        ${location.description ?? null},
        ${location.parentId ?? null},
        ${location.parentLocationMarker ? JSON.stringify(location.parentLocationMarker) : null}::json,
        ${location.imagePath ?? null},
        ${location.additionalInfo ? JSON.stringify(location.additionalInfo) : null}::json
      )
      RETURNING *
    `)
    return (result.rows[0] as Location) ?? null
  }

  async search(query: string, limit = 20): Promise<Location[]> {
    return db.query.LocationTable.findMany({
      where: (locations) => ilike(locations.name, `%${query}%`),
      limit,
    })
  }
}
