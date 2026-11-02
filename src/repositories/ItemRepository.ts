import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  or,
  type SQL,
  sql,
} from "drizzle-orm"
import type { Item, PaginatedResult } from "../app/types"
import { db } from "../db"
import { type ItemInsert, ItemTable, LocationTable } from "../drizzle/schema"
import { type PhotoDescription, photoSearchTerms } from "../lib/photoMatch"
import { parseSearchQuery, patternToLike } from "../lib/searchQuery"

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

  /**
   * Full-text search over items. The query may contain category filters
   * (`cat:"Name"`, `tag:Akku`, `cat:Elektro*`, see searchQuery.ts) next to free text.
   */
  async search(query: string): Promise<Item[]> {
    const { text, categories, tags } = parseSearchQuery(query)

    if (!text && categories.length === 0 && tags.length === 0) {
      const items = await this.findLatest()
      return items.map((item) => ({ ...item, rank: 0, similarity: 0 }))
    }

    // An item has one category, so several filters mean "any of them"
    const categoryFilter =
      categories.length > 0
        ? or(
            ...categories.map(
              (category) =>
                sql`${ItemTable.category} ILIKE ${patternToLike(category)}`,
            ),
          )
        : undefined

    // Tags narrow down: an item must have every filtered tag
    const tagFilters = tags.map(
      (tag) => sql`EXISTS (
        SELECT 1 FROM unnest(${ItemTable.tags}) AS item_tag
        WHERE item_tag ILIKE ${patternToLike(tag)}
      )`,
    )
    const filters = and(categoryFilter, ...tagFilters)

    const results = db
      .select(itemWithLocationName)
      .from(ItemTable)
      .leftJoin(LocationTable, eq(ItemTable.locationId, LocationTable.id))

    // Browsing by category or tags: all matching items, alphabetically
    if (!text) {
      return results.where(filters).orderBy(asc(ItemTable.name))
    }

    const textFilter: SQL = sql`(search_vector @@ plainto_tsquery('german', ${text})
        OR searchable_text % ${text}
        OR searchable_text ILIKE ${`%${text}%`}
        OR EXISTS (
          SELECT 1 FROM unnest(tags) AS tag
          WHERE tag ILIKE ${`%${text}%`}
        ))`

    return results
      .where(and(textFilter, filters))
      .orderBy(sql`(ts_rank(search_vector, plainto_tsquery('german', ${text})) * 2
                       + similarity(searchable_text, ${text})) DESC,
        ${ItemTable.id} DESC`)
      .limit(100)
  }

  /**
   * Items sharing at least one signal with the AI description of a photo
   * (words, name, category or tags), with the raw text rank and name
   * similarity. Ranking happens in rankPhotoMatches (photoMatch.ts).
   */
  async findPhotoCandidates(description: PhotoDescription) {
    const terms = photoSearchTerms(description)
    const query = sql`websearch_to_tsquery('german', ${terms})`
    const lowerTags = description.tags.map((tag) => tag.trim().toLowerCase())

    const signals: SQL[] = [
      sql`search_vector @@ ${query}`,
      sql`word_similarity(${description.name}, ${ItemTable.name}) > 0.4`,
    ]
    if (description.category) {
      signals.push(
        sql`${ItemTable.category} ILIKE ${patternToLike(description.category)}`,
      )
    }
    if (lowerTags.length > 0) {
      signals.push(sql`EXISTS (
        SELECT 1 FROM unnest(${ItemTable.tags}) AS item_tag
        WHERE lower(item_tag) IN (${sql.join(
          lowerTags.map((tag) => sql`${tag}`),
          sql`, `,
        )})
      )`)
    }

    return db
      .select({
        ...itemWithLocationName,
        // Normalized to 0..1 (rank / (rank + 1))
        textRank: sql<number>`ts_rank(search_vector, ${query}, 32)`.mapWith(
          Number,
        ),
        nameSimilarity:
          sql<number>`word_similarity(${description.name}, ${ItemTable.name})`.mapWith(
            Number,
          ),
      })
      .from(ItemTable)
      .leftJoin(LocationTable, eq(ItemTable.locationId, LocationTable.id))
      .where(or(...signals))
      .limit(300)
  }
}
