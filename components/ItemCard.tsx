import type { Item } from "@server/app/types"
import { Link } from "@tanstack/react-router"
import { ImageOffIcon, MapPinIcon } from "lucide-react"

// Matches the grid columns in ItemList, so the browser picks the smallest
// image that is still sharp at the tile's size
const TILE_SIZES =
  "(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"

export function ItemCard({ item }: { item: Item }) {
  const imageUrl = `/img/items/${item.imagePath}`

  return (
    <div className="group">
      <Link
        to="/i/$itemId"
        params={{ itemId: item.id.toString() }}
        className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="aspect-square overflow-hidden rounded-lg border bg-muted transition-shadow group-hover:shadow-md">
          {item.imagePath ? (
            // The name below already labels the link, so the image is decorative
            <img
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              src={`${imageUrl}?size=m`}
              srcSet={`${imageUrl}?size=s 200w, ${imageUrl}?size=m 600w, ${imageUrl} 1000w`}
              sizes={TILE_SIZES}
              alt=""
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground"
              aria-hidden="true"
            >
              <ImageOffIcon className="h-8 w-8" />
              <span className="text-xs">Kein Foto</span>
            </div>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">
          {item.name}
        </p>
      </Link>
      {item.locationName && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPinIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.locationName}</span>
        </p>
      )}
    </div>
  )
}
