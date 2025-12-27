import { eq, sql } from "drizzle-orm"
import type { Item } from "../app/types"
import { db } from "../db"
import { type ItemInsert, ItemTable } from "../drizzle/schema"

export interface SearchResult extends Item {
  rank: number
  similarity: number
}

export class ItemRepository {
  async upsert(item: Partial<Item>): Promise<Item[] | undefined> {
    if (item.id) {
      return db
        .update(ItemTable)
        .set(item)
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
  async findByLocationId(locationId: number): Promise<Item[]> {
    return db.query.ItemTable.findMany({
      where: (items, { eq }) => eq(items.locationId, locationId),
    })
  }

  async search(query: string): Promise<Item[]> {
    if (!query || query.trim().length === 0) {
      const items = await this.findLatest()
      return items.map((item) => ({ ...item, rank: 0, similarity: 0 }))
    }

    const searchText = query.trim()

    const results = await db
      .select()
      .from(ItemTable)
      .where(sql`search_vector @@ plainto_tsquery('german', ${searchText})
        OR searchable_text % ${searchText}
        OR searchable_text ILIKE ${"%" + searchText + "%"}
        OR EXISTS (
          SELECT 1 FROM unnest(tags) AS tag
          WHERE tag ILIKE ${"%" + searchText + "%"}
        )`)
      .orderBy(sql`(ts_rank(search_vector, plainto_tsquery('german', ${searchText})) * 2
                       + similarity(searchable_text, ${searchText})) DESC,
        id DESC`)
      .limit(100)

    // const results = await db.execute(sql`
    //   SELECT
    //     *,
    //     ts_rank(search_vector, plainto_tsquery('german', ${searchText})) as search_rank,
    //     similarity(searchable_text, ${searchText}) as similarity_score
    //   FROM items
    //   WHERE
    //     search_vector @@ plainto_tsquery('german', ${searchText})
    //     OR searchable_text % ${searchText}
    //     OR searchable_text ILIKE ${"%" + searchText + "%"}
    //     OR EXISTS (
    //       SELECT 1 FROM unnest(tags) AS tag
    //       WHERE tag ILIKE ${"%" + searchText + "%"}
    //     )
    //   ORDER BY
    //     (ts_rank(search_vector, plainto_tsquery('german', ${searchText})) * 2
    //       + similarity(searchable_text, ${searchText})) DESC,
    //     id DESC
    //   LIMIT 100;`)
    console.log(results)
    return results
  }
}
