import { eq, ilike, sql } from "drizzle-orm"
import { db } from "@/src/db"
import type { Location } from "../app/types"
import { type LocationInsert, LocationTable } from "../drizzle/schema"

export type LocationLabelInfo = {
  id: number
  name: string
  /** Names of the parent locations, from the root down */
  path: string[]
}

// Every location with the ids and names of its ancestors (ids includes
// the location itself), walking down from the root locations
const locationTree = sql`
  WITH RECURSIVE tree AS (
    SELECT id, name, ARRAY[id] AS ids, ARRAY[]::text[] AS ancestors
    FROM locations WHERE parent_id IS NULL
    UNION ALL
    SELECT l.id, l.name, tree.ids || l.id, tree.ancestors || tree.name::text
    FROM locations l JOIN tree ON l.parent_id = tree.id
  )`

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
  async restore(
    location: Partial<Location> & { id: number },
  ): Promise<Location | null> {
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

  /**
   * Name and parent path (names from the root down) of the given
   * locations, for labels
   */
  async findLabelInfo(ids: number[]): Promise<LocationLabelInfo[]> {
    if (ids.length === 0) return []
    const result = await db.execute(sql`
      ${locationTree}
      SELECT id, name, ancestors AS path FROM tree
      WHERE id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`)
    return result.rows as LocationLabelInfo[]
  }

  /** A location and all its sublocations, in tree order */
  async findSubtree(id: number): Promise<LocationLabelInfo[]> {
    const result = await db.execute(sql`
      ${locationTree}
      SELECT id, name, ancestors AS path FROM tree
      WHERE ${id} = ANY(ids)
      ORDER BY ancestors || name`)
    return result.rows as LocationLabelInfo[]
  }

  /**
   * Items stored in a location or any of its sublocations, sorted by
   * location (in tree order) and name
   */
  async findItemsInSubtree(
    id: number,
  ): Promise<{ id: number; name: string }[]> {
    const result = await db.execute(sql`
      ${locationTree}
      SELECT items.id, items.name FROM items
      JOIN tree ON items.location_id = tree.id
      WHERE ${id} = ANY(tree.ids)
      ORDER BY tree.ancestors || tree.name::text, items.name`)
    return result.rows as { id: number; name: string }[]
  }
}
