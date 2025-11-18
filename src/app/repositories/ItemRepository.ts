import { db } from "../../db"
import type { Item } from "../types"

export class ItemRepository {
	async findById(id: number): Promise<Item | undefined> {
		var item = await db.query.ItemTable.findFirst({
			where: (items, { eq }) => eq(items.id, id),
		})
		if (item === null || item === undefined) {
			return undefined
		}
		return item
	}
}
