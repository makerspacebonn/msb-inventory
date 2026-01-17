import { and, count, desc, eq, gt, inArray, ne } from "drizzle-orm"
import type {
  ChangelogEntry,
  ChangelogEntryWithUser,
  ChangeType,
  EntityType,
  PaginatedResult,
} from "../app/types"
import { db } from "../db"
import {
  ChangelogTable,
  ItemTable,
  LocationTable,
  UserTable,
} from "../drizzle/schema"

type ChangelogCreateInput = {
  entityType: EntityType
  entityId: number
  changeType: ChangeType
  userId: string | null
  beforeValues: Record<string, unknown> | null
  afterValues: Record<string, unknown> | null
  changedFields: string[]
}

export class ChangelogRepository {
  async create(entry: ChangelogCreateInput): Promise<ChangelogEntry> {
    const [result] = await db
      .insert(ChangelogTable)
      .values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        changeType: entry.changeType,
        userId: entry.userId,
        beforeValues: entry.beforeValues,
        afterValues: entry.afterValues,
        changedFields: entry.changedFields,
      })
      .returning()
    return result as ChangelogEntry
  }

  async findById(id: number): Promise<ChangelogEntry | undefined> {
    const result = await db.query.ChangelogTable.findFirst({
      where: eq(ChangelogTable.id, id),
    })
    return result as ChangelogEntry | undefined
  }

  async findPaginated(
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResult<ChangelogEntryWithUser>> {
    const offset = (page - 1) * pageSize

    const [entries, totalResult] = await Promise.all([
      db
        .select({
          id: ChangelogTable.id,
          entityType: ChangelogTable.entityType,
          entityId: ChangelogTable.entityId,
          changeType: ChangelogTable.changeType,
          userId: ChangelogTable.userId,
          changedAt: ChangelogTable.changedAt,
          beforeValues: ChangelogTable.beforeValues,
          afterValues: ChangelogTable.afterValues,
          changedFields: ChangelogTable.changedFields,
          userName: UserTable.name,
        })
        .from(ChangelogTable)
        .leftJoin(UserTable, eq(ChangelogTable.userId, UserTable.id))
        .orderBy(desc(ChangelogTable.changedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(ChangelogTable),
    ])

    const entriesWithNames = await this.resolveEntityNames(entries)
    const total = totalResult[0]?.count ?? 0

    return {
      items: entriesWithNames,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async findConflictingChanges(
    entryId: number,
    entityType: string,
    entityId: number,
    changedFields: string[],
  ): Promise<ChangelogEntry | null> {
    const entry = await this.findById(entryId)
    if (!entry) return null

    // Find any newer change on the same entity (excluding the current entry)
    const newerChanges = await db
      .select()
      .from(ChangelogTable)
      .where(
        and(
          eq(ChangelogTable.entityType, entityType),
          eq(ChangelogTable.entityId, entityId),
          gt(ChangelogTable.changedAt, entry.changedAt),
          ne(ChangelogTable.id, entryId), // Exclude current entry to avoid self-conflict
        ),
      )
      .orderBy(desc(ChangelogTable.changedAt))

    if (newerChanges.length === 0) return null

    // Check for overlapping fields
    for (const change of newerChanges) {
      const changeFields = change.changedFields || []

      // For delete operations, any newer change is a conflict
      if (entry.changeType === "delete" || change.changeType === "delete") {
        return change as ChangelogEntry
      }

      // Check if any fields overlap
      const hasOverlap = changedFields.some((f) => changeFields.includes(f))
      if (hasOverlap) {
        return change as ChangelogEntry
      }
    }

    return null
  }

  async findByEntity(
    entityType: EntityType,
    entityId: number,
  ): Promise<ChangelogEntry[]> {
    const results = await db
      .select()
      .from(ChangelogTable)
      .where(
        and(
          eq(ChangelogTable.entityType, entityType),
          eq(ChangelogTable.entityId, entityId),
        ),
      )
      .orderBy(desc(ChangelogTable.changedAt))

    return results as ChangelogEntry[]
  }

  private async resolveEntityNames(
    entries: Array<{
      id: number
      entityType: string
      entityId: number
      changeType: string
      userId: string | null
      changedAt: Date
      beforeValues: Record<string, unknown> | null
      afterValues: Record<string, unknown> | null
      changedFields: string[] | null
      userName: string | null
    }>,
  ): Promise<ChangelogEntryWithUser[]> {
    // Collect unique entity IDs by type
    const itemIds = [
      ...new Set(
        entries.filter((e) => e.entityType === "item").map((e) => e.entityId),
      ),
    ]
    const locationIds = [
      ...new Set(
        entries
          .filter((e) => e.entityType === "location")
          .map((e) => e.entityId),
      ),
    ]

    // Batch fetch entity names
    const [items, locations] = await Promise.all([
      itemIds.length > 0
        ? db
            .select({ id: ItemTable.id, name: ItemTable.name })
            .from(ItemTable)
            .where(inArray(ItemTable.id, itemIds))
        : [],
      locationIds.length > 0
        ? db
            .select({ id: LocationTable.id, name: LocationTable.name })
            .from(LocationTable)
            .where(inArray(LocationTable.id, locationIds))
        : [],
    ])

    const itemMap = new Map(items.map((i) => [i.id, i.name]))
    const locationMap = new Map(locations.map((l) => [l.id, l.name]))

    return entries.map((e) => {
      // Try to get name from current entity, fall back to stored values
      const entityMap = e.entityType === "item" ? itemMap : locationMap
      const entityName =
        entityMap.get(e.entityId) ||
        (e.afterValues?.name as string) ||
        (e.beforeValues?.name as string) ||
        null

      return {
        id: e.id,
        entityType: e.entityType as EntityType,
        entityId: e.entityId,
        changeType: e.changeType as ChangeType,
        userId: e.userId,
        changedAt: e.changedAt,
        beforeValues: e.beforeValues,
        afterValues: e.afterValues,
        changedFields: e.changedFields,
        user: e.userName ? { name: e.userName } : null,
        entityName,
      }
    })
  }
}
