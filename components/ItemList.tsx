import type { Item } from "@server/app/types"
import { Button } from "@/components/ui/button"

export const ItemList = ({ items }: { items: Item[] }) => {
  return (
    <ul className="flex flex-col gap-2">
      {items?.map((item, _) => {
        return (
          <li
            key={item.id}
            className="p-4 border-b border-amber-800 flex flex-row"
          >
            {item.imagePath && (
              <img
                className="h-15"
                src={`/container/img/items/${item.imagePath}`}
                alt={item.description || ""}
              />
            )}
            "
            <a href={`/i/${item.id}`} className="flex-auto">
              {item.id} - {item.name}
            </a>{" "}
            |{" "}
            <Button variant="outline" size="icon-sm">
              <a href={`/i/${item.id}/edit`}>Edit</a>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
