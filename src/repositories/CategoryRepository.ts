import { asc, sql } from "drizzle-orm"
import { db } from "../db"
import { CategoryTable } from "../drizzle/schema"

export class CategoryRepository {
  async findAllNames(): Promise<string[]> {
    const rows = await db
      .select({ name: CategoryTable.name })
      .from(CategoryTable)
      .orderBy(asc(CategoryTable.name))
    return rows.map((row) => row.name)
  }

  /**
   * Returns the stored spelling of a category, creating it if it doesn't
   * exist yet. Matching is case-insensitive, so "messtechnik" resolves to
   * an existing "Messtechnik" instead of creating a duplicate.
   */
  async ensure(name: string): Promise<string> {
    const trimmed = name.trim()
    const [existing] = await db
      .select({ name: CategoryTable.name })
      .from(CategoryTable)
      .where(sql`lower(${CategoryTable.name}) = lower(${trimmed})`)
    if (existing) return existing.name

    await db
      .insert(CategoryTable)
      .values({ name: trimmed })
      .onConflictDoNothing()
    return trimmed
  }
}
