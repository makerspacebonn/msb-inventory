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

    // Cache all tags with their counts for filtering
    if (!tagsCache || now - tagsCache.timestamp > CACHE_TTL_MS) {
      const result = await db.execute<{ tag: string }>(
        sql`SELECT unnest(tags) as tag, COUNT(*) as count FROM items WHERE tags IS NOT NULL GROUP BY tag ORDER BY count DESC`,
      )
      const tags = result.rows
        .map((row) => row.tag)
        .filter((tag): tag is string => tag !== null)

      tagsCache = { tags, timestamp: now }
    }

    let filteredTags = tagsCache.tags
    if (search) {
      filteredTags = tagsCache.tags.filter((tag) =>
        tag.toLowerCase().includes(search.toLowerCase()),
      )
    }

    // Return top 10 most relevant (already sorted by count)
    return filteredTags.slice(0, 10)
  }

  invalidateCache(): void {
    tagsCache = null
  }
}