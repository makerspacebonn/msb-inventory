import { sql } from "drizzle-orm"
import { db } from "../db"

const CACHE_TTL_MS = 60 * 1000 // 1 minute

let tagsCache: {
  tags: string[]
  timestamp: number
} | null = null

export class TagsRepository {
  async findUniqueTags(search?: string): Promise<string[]> {
    const now = Date.now()

    if (!tagsCache || now - tagsCache.timestamp > CACHE_TTL_MS) {
      const result = await db.execute<{ tag: string }>(
        sql`SELECT DISTINCT unnest(tags) as tag FROM items WHERE tags IS NOT NULL ORDER BY tag LIMIT 50`,
      )
      const tags = result.rows
        .map((row) => row.tag)
        .filter((tag): tag is string => tag !== null)

      tagsCache = { tags, timestamp: now }
    }

    if (search) {
      return tagsCache.tags.filter((tag) =>
        tag.toLowerCase().includes(search.toLowerCase()),
      )
    }
    return tagsCache.tags
  }

  invalidateCache(): void {
    tagsCache = null
  }
}