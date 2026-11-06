import { createServerFn } from "@tanstack/react-start"
import { count, isNotNull, sql } from "drizzle-orm"
import type { Item } from "@/src/app/types"
import { db } from "@/src/db"
import { ItemTable, LocationTable } from "@/src/drizzle/schema"
import {
  type ActivityStats,
  lastDays,
  parsePeriod,
  summarizeActivity,
} from "@/src/lib/activityStats"
import { authMiddleware } from "@/src/middleware/authMiddleware"
import { StatsRepository } from "@/src/repositories/StatsRepository"

export interface InventoryStats {
  totalItems: number
  totalLocations: number
  itemsWithImages: number
  recentItems: number
  lastUpdated: string
}

// In-memory cache: the counts are cheap but needn't be live; an hour keeps
// new items showing up the same day
const CACHE_TTL_MS = 60 * 60 * 1000

let cachedStats: InventoryStats | null = null
let cacheTimestamp: number | null = null

async function fetchStatsFromDb(): Promise<InventoryStats> {
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const [
    itemCountResult,
    locationCountResult,
    itemsWithImagesResult,
    recentItemsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(ItemTable),
    db.select({ count: count() }).from(LocationTable),
    db
      .select({ count: count() })
      .from(ItemTable)
      .where(isNotNull(ItemTable.imagePath)),
    db
      .select({ count: count() })
      .from(ItemTable)
      .where(sql`${ItemTable.createdAt} >= ${oneMonthAgo}`),
  ])

  return {
    totalItems: itemCountResult[0]?.count ?? 0,
    totalLocations: locationCountResult[0]?.count ?? 0,
    itemsWithImages: itemsWithImagesResult[0]?.count ?? 0,
    recentItems: recentItemsResult[0]?.count ?? 0,
    lastUpdated: new Date().toISOString(),
  }
}

export const fetchInventoryStats = createServerFn().handler(
  async (): Promise<InventoryStats> => {
    const now = Date.now()

    // Check if cache is valid
    if (cachedStats && cacheTimestamp && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedStats
    }

    // Fetch fresh stats and update cache
    const stats = await fetchStatsFromDb()
    cachedStats = stats
    cacheTimestamp = now

    return stats
  },
)

/**
 * Searches and changes per day over the last 7, 30 or 90 days, for
 * everyone. Who changed what is only for logged-in users, like the
 * changelog it comes from: visitors get no per-person rows at all
 */
export const fetchActivityStats = createServerFn()
  .middleware([authMiddleware])
  .validator((period: number) => parsePeriod(period))
  .handler(async ({ data: period, context }): Promise<ActivityStats> => {
    const days = lastDays(period)
    const stats = new StatsRepository()
    const [searches, changes, perUser] = await Promise.all([
      stats.searchesSince(days[0]),
      stats.changesSince(days[0]),
      context.isLoggedIn ? stats.changesPerUserSince(days[0]) : null,
    ])
    return summarizeActivity(days, searches, changes, perUser)
  })

export type MostViewedItem = { item: Item; views: number }

/** The five items viewed most in the last 7 days, for the front page */
export const fetchMostViewedItems = createServerFn().handler(
  async (): Promise<MostViewedItem[]> => {
    return new StatsRepository().mostViewedSince(lastDays(7)[0], 5)
  },
)
