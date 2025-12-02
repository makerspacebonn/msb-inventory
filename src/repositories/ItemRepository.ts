import { eq } from "drizzle-orm"
import type { Item } from "../app/types"
import { db } from "../db"
import { type ItemInsert, ItemTable } from "../drizzle/schema"

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
}
