import { count, desc, eq, getTableColumns, sql } from "drizzle-orm"
import type { Item, PaginatedResult } from "../app/types"
import { db } from "../db"
import { type ItemInsert, ItemTable, LocationTable } from "../drizzle/schema"

// Item columns plus the name of the item's direct location, for item lists
const itemWithLocationName = {
  ...getTableColumns(ItemTable),
  locationName: LocationTable.name,
}

export interface SearchResult extends Item {
  rank: number
  similarity: number
}

export class ItemRepository {
  async upsert(item: Partial<Item>): Promise<Item[] | undefined> {
    if (item.id) {
      return db
        .update(ItemTable)
        .set({ ...item, updatedAt: new Date() })
        .where(eq(ItemTable.id, item.id))
        .returning()
    }
    return db
      .insert(ItemTable)
      .values(item as ItemInsert)
      .returning()
  }
  async findById(id: number): Promise<Item | undefined> {
    const item: Item | undefined = await db.query.ItemTable.findFirst({
      where: (items, { eq }) => eq(items.id, id),
    })
    return item
  }
  async findLatest(): Promise<Item[]> {
    return db.query.ItemTable.findMany({
      orderBy: (items, { desc }) => [desc(items.id)],
    })
  }

  async findPaginated(page = 1, pageSize = 24): Promise<PaginatedResult<Item>> {
    const offset = (page - 1) * pageSize

    const [items, totalResult] = await Promise.all([
      db
        .select(itemWithLocationName)
        .from(ItemTable)
        .leftJoin(LocationTable, eq(ItemTable.locationId, LocationTable.id))
        .orderBy(desc(ItemTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(ItemTable),
    ])

    const total = totalResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    }
  }
  async findRecentItems(limit = 50): Promise<Item[]> {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    return db.query.ItemTable.findMany({
      where: (items, { gte }) => gte(items.createdAt, oneMonthAgo),
      orderBy: (items, { desc }) => [desc(items.createdAt)],
      limit,
    })
  }
  async findByLocationId(locationId: number): Promise<Item[]> {
    return db.query.ItemTable.findMany({
      where: (items, { eq }) => eq(items.locationId, locationId),
    })
  }

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(ItemTable)
      .where(eq(ItemTable.id, id))
      .returning()
    return result.length > 0
  }

  /**
   * Restore a deleted item with its original ID.
   * Uses raw SQL INSERT to bypass the auto-increment behavior.
   */
  async restore(item: Partial<Item> & { id: number }): Promise<Item | null> {
    const result = await db
      .insert(ItemTable)
      .values({
        ...item,
        createdAt: item.createdAt ?? new Date(),
      } as ItemInsert)
      .returning()
    return result[0] ?? null
  }

  async search(query: string): Promise<Item[]> {
    if (!query || query.trim().length === 0) {
      const items = await this.findLatest()
      return items.map((item) => ({ ...item, rank: 0, similarity: 0 }))
    }

    const searchText = query.trim()

    const results = await db
      .select(itemWithLocationName)
      .from(ItemTable)
      .leftJoin(LocationTable, eq(ItemTable.locationId, LocationTable.id))
      .where(sql`search_vector @@ plainto_tsquery('german', ${searchText})
        OR searchable_text % ${searchText}
        OR searchable_text ILIKE ${`%${searchText}%`}
        OR EXISTS (
          SELECT 1 FROM unnest(tags) AS tag
          WHERE tag ILIKE ${`%${searchText}%`}
        )`)
      .orderBy(sql`(ts_rank(search_vector, plainto_tsquery('german', ${searchText})) * 2
                       + similarity(searchable_text, ${searchText})) DESC,
        ${ItemTable.id} DESC`)
      .limit(100)

    return results
  }
}
