import { ItemCard } from "@/components/ItemCard"
import type { MostViewedItem } from "@/src/actions/statsActions"

/** Items as cards, most viewed first, each with its number of views */
export function MostViewedList({
  items,
  label,
}: {
  items: MostViewedItem[]
  label: string
}) {
  return (
    <ol
      aria-label={label}
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5"
    >
      {items.map(({ item, views }) => (
        <li key={item.id}>
          <ItemCard item={item} />
          <p className="mt-0.5 text-xs text-muted-foreground">
            {views.toLocaleString("de-DE")} {views === 1 ? "Aufruf" : "Aufrufe"}
          </p>
        </li>
      ))}
    </ol>
  )
}
