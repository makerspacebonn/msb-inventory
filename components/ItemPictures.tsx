import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Item } from "@/src/app/types"
import { picturePaths } from "@/src/lib/itemPictures"

/** The item's main picture; thumbnails below switch to its other pictures */
export function ItemPictures({ item }: { item: Item }) {
  const paths = picturePaths(item)
  const [shown, setShown] = useState(0)
  if (paths.length === 0) return null

  const current = Math.min(shown, paths.length - 1)
  return (
    <div className="mb-4">
      <img
        className="rounded-2xl w-128 aspect-square object-cover"
        src={`/img/items/${paths[current]}`}
        alt={current === 0 ? item.name : `${item.name}, Bild ${current + 1}`}
      />
      {paths.length > 1 && (
        <ol aria-label="Bilder" className="mt-2 flex flex-wrap gap-2">
          {paths.map((path, i) => (
            <li key={path}>
              <button
                type="button"
                aria-label={`Bild ${i + 1} anzeigen`}
                aria-pressed={i === current}
                onClick={() => setShown(i)}
                className={cn(
                  "block size-16 overflow-hidden rounded-lg border-2",
                  i === current ? "border-primary" : "border-transparent",
                )}
              >
                <img
                  src={`/img/items/${path}`}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
