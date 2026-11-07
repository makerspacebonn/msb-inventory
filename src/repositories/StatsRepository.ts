import { count, desc, eq, gte, sql, sum } from "drizzle-orm"
import type { ChangeType, Item } from "../app/types"
import { db } from "../db"
import {
  ChangelogTable,
  ItemTable,
  ItemViewTable,
  LocationTable,
  SearchCountTable,
  UserTable,
} from "../drizzle/schema"
import { berlinDay, STATS_TIME_ZONE } from "../lib/activityStats"
import { RecentViews, viewerKey } from "../lib/viewCounting"

// changed_at is stored without a time zone, in UTC (the database default):
// convert it to the calendar day in Bonn, like the search counts
const changeDay = sql<string>`to_char((${ChangelogTable.changedAt} AT TIME ZONE 'UTC') AT TIME ZONE ${sql.raw(`'${STATS_TIME_ZONE}'`)}, 'YYYY-MM-DD')`

export type ChangeCount = { day: string; changeType: ChangeType; count: number }
export type UserChangeCount = {
  userId: string | null
  name: string | null
  changeType: ChangeType
  count: number
}

export class StatsRepository {
  /** Adds one search to the given day */
  async countSearch(day: string): Promise<void> {
    await db
      .insert(SearchCountTable)
      .values({ day, count: 1 })
      .onConflictDoUpdate({
        target: SearchCountTable.day,
        set: { count: sql`${SearchCountTable.count} + 1` },
      })
  }

  /** Adds one view of an item's page to the given day */
  async countItemView(itemId: number, day: string): Promise<void> {
    await db
      .insert(ItemViewTable)
      .values({ itemId, day, count: 1 })
      .onConflictDoUpdate({
        target: [ItemViewTable.itemId, ItemViewTable.day],
        set: { count: sql`${ItemViewTable.count} + 1` },
      })
  }

  /**
   * The items with the most views since the given day, or ever without one,
   * most viewed first
   */
  async mostViewedSince(
    firstDay: string | null,
    limit: number,
  ): Promise<{ item: Item; views: number }[]> {
    const views = sum(ItemViewTable.count).mapWith(Number)
    const rows = await db
      .select({ item: ItemTable, locationName: LocationTable.name, views })
      .from(ItemViewTable)
      .innerJoin(ItemTable, eq(ItemTable.id, ItemViewTable.itemId))
      .leftJoin(LocationTable, eq(LocationTable.id, ItemTable.locationId))
      .where(firstDay ? gte(ItemViewTable.day, firstDay) : undefined)
      .groupBy(ItemTable.id, LocationTable.name)
      .orderBy(desc(views), ItemTable.name)
      .limit(limit)
    return rows.map(({ item, locationName, views }) => ({
      item: { ...item, locationName: locationName ?? undefined } as Item,
      views,
    }))
  }

  async searchesSince(
    firstDay: string,
  ): Promise<{ day: string; count: number }[]> {
    return db
      .select({ day: SearchCountTable.day, count: SearchCountTable.count })
      .from(SearchCountTable)
      .where(gte(SearchCountTable.day, firstDay))
  }

  /** Changes per day and kind (created, updated, deleted) */
  async changesSince(firstDay: string): Promise<ChangeCount[]> {
    const rows = await db
      .select({
        day: changeDay,
        changeType: ChangelogTable.changeType,
        count: count(),
      })
      .from(ChangelogTable)
      .where(gte(changeDay, firstDay))
      .groupBy(changeDay, ChangelogTable.changeType)
    return rows as ChangeCount[]
  }

  /** Changes per person and kind; entries without a user stay one group */
  async changesPerUserSince(firstDay: string): Promise<UserChangeCount[]> {
    const rows = await db
      .select({
        userId: ChangelogTable.userId,
        name: UserTable.name,
        changeType: ChangelogTable.changeType,
        count: count(),
      })
      .from(ChangelogTable)
      .leftJoin(UserTable, eq(UserTable.id, ChangelogTable.userId))
      .where(gte(changeDay, firstDay))
      .groupBy(ChangelogTable.userId, UserTable.name, ChangelogTable.changeType)
    return rows as UserChangeCount[]
  }
}

/**
 * Counts one search for today. A failure is only logged: statistics must
 * never stop a search
 */
export async function recordSearch(): Promise<void> {
  try {
    await new StatsRepository().countSearch(berlinDay(new Date()))
  } catch (error) {
    console.error("Counting the search failed:", error)
  }
}

const recentViews = new RecentViews()

/**
 * Counts a view of an item's page for today, unless the same person viewed
 * it within the last hour. Failures are only logged
 */
export async function recordItemView(
  itemId: number,
  viewer: {
    userId: string | null
    ip: string | undefined
    userAgent: string | null
  },
): Promise<void> {
  const day = berlinDay(new Date())
  if (!recentViews.shouldCount(viewerKey({ ...viewer, day }), itemId)) return
  try {
    await new StatsRepository().countItemView(itemId, day)
  } catch (error) {
    console.error("Counting the item view failed:", error)
  }
}
