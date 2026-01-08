import { useEffect, useRef } from "react"
import type { Item } from "@server/app/types"
import { ItemCard } from "@/components/ItemCard"
import { Loader2 } from "lucide-react"

export type InfiniteScrollProps = {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}

export function ItemList({
  items,
  infiniteScroll,
}: {
  items: Item[]
  infiniteScroll?: InfiniteScrollProps
}) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!infiniteScroll?.hasMore || infiniteScroll.isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          infiniteScroll.onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [infiniteScroll])

  if (!items?.length) {
    return (
      <p className="text-center text-muted-foreground py-8">No items found.</p>
    )
  }

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <ItemCard item={item} />
          </li>
        ))}
      </ul>

      {infiniteScroll && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {infiniteScroll.isLoading && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
}