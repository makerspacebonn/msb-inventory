import type { Item } from "@server/app/types"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"

export function ItemCard({ item }: { item: Item }) {
  return (
    <div className="group rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        {item.imagePath ? (
          <img
            className="h-16 w-16 rounded-md object-cover"
            src={`/container/img/items/${item.imagePath}`}
            alt={item.description || item.name}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <span className="text-xs">No image</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <a
            href={`/i/${item.id}`}
            className="block truncate font-semibold hover:underline"
          >
            {item.name}
          </a>
          {item.description && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
        <Button variant="outline" size="icon" asChild>
          <a href={`/i/${item.id}/edit`} aria-label={`Edit ${item.name}`}>
            <Pencil className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}