import type { Item } from "@server/app/types"
import { ItemCard } from "@/components/ItemCard"

export function ItemList({ items }: { items: Item[] }) {
  if (!items?.length) {
    return (
      <p className="text-center text-muted-foreground py-8">No items found.</p>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  )
}
