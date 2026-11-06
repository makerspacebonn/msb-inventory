import { and, count, desc, eq, gt, inArray, ne } from "drizzle-orm"
import type {
  ChangelogEntry,
  ChangelogEntryWithUser,
  ChangeType,
  EntityType,
  JsonObject,
  PaginatedResult,
} from "../app/types"
import { type Database, db as defaultDb } from "../db"
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
  beforeValues: JsonObject | null
  afterValues: JsonObject | null
  changedFields: string[]
  groupId?: string | null
}

export class ChangelogRepository {
  /** Pass a transaction to make the calls part of it */
  constructor(private readonly db: Database = defaultDb) {}

  async create(entry: ChangelogCreateInput): Promise<ChangelogEntry> {
    const [result] = await this.db
      .insert(ChangelogTable)
      .values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        changeType: entry.changeType,
        userId: entry.userId,
        beforeValues: entry.beforeValues,
        afterValues: entry.afterValues,
        changedFields: entry.changedFields,
        groupId: entry.groupId ?? null,
      })
      .returning()
    return result as ChangelogEntry
  }

  async findById(id: number): Promise<ChangelogEntry | undefined> {
    const result = await this.db.query.ChangelogTable.findFirst({
      where: eq(ChangelogTable.id, id),
    })
    return result as ChangelogEntry | undefined
  }

  /** The entry and all entries undone with it, last change first */
  async findWithGroup(entry: ChangelogEntry): Promise<ChangelogEntry[]> {
    if (!entry.groupId) return [entry]
    const entries = await this.db
      .select()
      .from(ChangelogTable)
      .where(eq(ChangelogTable.groupId, entry.groupId))
      .orderBy(desc(ChangelogTable.changedAt), desc(ChangelogTable.id))
    return entries as ChangelogEntry[]
  }

  async findPaginated(
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResult<ChangelogEntryWithUser>> {
    const offset = (page - 1) * pageSize

    const [entries, totalResult] = await Promise.all([
      this.db
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
          groupId: ChangelogTable.groupId,
          userName: UserTable.name,
        })
        .from(ChangelogTable)
        .leftJoin(UserTable, eq(ChangelogTable.userId, UserTable.id))
        .orderBy(desc(ChangelogTable.changedAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(ChangelogTable),
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
    const newerChanges = await this.db
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
    const results = await this.db
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
      beforeValues: JsonObject | null
      afterValues: JsonObject | null
      changedFields: string[] | null
      groupId: string | null
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
        ? this.db
            .select({ id: ItemTable.id, name: ItemTable.name })
            .from(ItemTable)
            .where(inArray(ItemTable.id, itemIds))
        : [],
      locationIds.length > 0
        ? this.db
            .select({ id: LocationTable.id, name: LocationTable.name })
            .from(LocationTable)
            .where(inArray(LocationTable.id, locationIds))
        : [],
    ])

    const itemMap = new Map(items.map((i) => [i.id, i.name]))
    const locationMap = new Map(locations.map((l) => [l.id, l.name]))

    const groupIds = [
      ...new Set(entries.flatMap((e) => (e.groupId ? [e.groupId] : []))),
    ]
    const groupRows =
      groupIds.length > 0
        ? await this.db
            .select({ groupId: ChangelogTable.groupId, size: count() })
            .from(ChangelogTable)
            .where(inArray(ChangelogTable.groupId, groupIds))
            .groupBy(ChangelogTable.groupId)
        : []
    const groupSizes = new Map(groupRows.map((r) => [r.groupId, r.size]))

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
        groupId: e.groupId,
        groupSize: e.groupId ? (groupSizes.get(e.groupId) ?? 1) : 1,
        user: e.userName ? { name: e.userName } : null,
        entityName,
      }
    })
  }
}

/**
 * Records a change to an item or location. `before`/`after` are the full
 * entity snapshots (null for the side that doesn't exist on create/delete).
 */
export function recordChange(
  change: {
    entityType: EntityType
    entityId: number
    changeType: ChangeType
    userId: string | null
    before: object | null
    after: object | null
    changedFields: string[]
    groupId?: string | null
  },
  database?: Database,
): Promise<ChangelogEntry> {
  return new ChangelogRepository(database).create({
    entityType: change.entityType,
    entityId: change.entityId,
    changeType: change.changeType,
    userId: change.userId,
    beforeValues: change.before as JsonObject | null,
    afterValues: change.after as JsonObject | null,
    changedFields: change.changedFields,
    groupId: change.groupId,
  })
}
