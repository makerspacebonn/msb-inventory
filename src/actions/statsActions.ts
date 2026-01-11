import { count, isNotNull, sql } from "drizzle-orm"
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/src/db"
import { ItemTable, LocationTable } from "@/src/drizzle/schema"

export interface InventoryStats {
  totalItems: number
  totalLocations: number
  itemsWithImages: number
  recentItems: number
  lastUpdated: string
}

// Simple in-memory cache with TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

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
  }
)

// Optional: Force refresh the cache (useful for admin operations)
export const refreshInventoryStats = createServerFn().handler(
  async (): Promise<InventoryStats> => {
    const stats = await fetchStatsFromDb()
    cachedStats = stats
    cacheTimestamp = Date.now()
    return stats
  }
)
