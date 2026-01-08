import { ItemList } from "@components/ItemList"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Loader2, PlusIcon, Search, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { fetchPaginatedItems, searchItems } from "@/src/actions/itemActions"
import type { Item } from "@/src/app/types"
import { useAuth } from "@/src/context/AuthContext"

export const Route = createFileRoute("/items/")({
  component: RouteComponent,
  loader: async () => {
    return fetchPaginatedItems({ data: { page: 1, pageSize: 24 } })
  },
  head: () => ({
    meta: [{ title: "Items | MSB Inventar" }],
  }),
})

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

function RouteComponent() {
  const initialData = Route.useLoaderData()
  const { isLoggedIn } = useAuth()

  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<Item[]>(initialData.items)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialData.page < initialData.totalPages)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Item[] | null>(null)

  const debouncedQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    setItems(initialData.items)
    setPage(1)
    setHasMore(initialData.page < initialData.totalPages)
    setSearchResults(null)
  }, [initialData])

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim() === "") {
        setSearchResults(null)
        setItems(initialData.items)
        setPage(1)
        setHasMore(initialData.page < initialData.totalPages)
        return
      }

      setIsSearching(true)
      try {
        const results = await searchItems({ data: debouncedQuery })
        setSearchResults(results)
        setItems(results)
        setHasMore(false)
      } catch (error) {
        console.error("Search failed:", error)
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [debouncedQuery, initialData])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setSearchResults(null)
    setItems(initialData.items)
    setPage(1)
    setHasMore(initialData.page < initialData.totalPages)
  }, [initialData])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      const result = await fetchPaginatedItems({ data: { page: nextPage, pageSize: 24 } })
      setItems((prev) => [...prev, ...result.items])
      setPage(nextPage)
      setHasMore(nextPage < result.totalPages)
    } catch (error) {
      console.error("Failed to load more items:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page])

  const isShowingSearch = searchResults !== null

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 text-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Suchen nach Name, Beschreibung, Hersteller, Tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 "
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {isLoggedIn && (
          <Button variant="outline" asChild>
            <Link to="/items/add">
              <PlusIcon />
              Add Item
            </Link>
          </Button>
        )}
      </div>
      {searchQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          {items.length} Ergebnis{items.length !== 1 ? "se" : ""} für "
          {searchQuery}"
        </p>
      )}
      <ItemList
        items={items}
        infiniteScroll={
          isShowingSearch
            ? undefined
            : {
                hasMore,
                isLoading,
                onLoadMore: loadMore,
              }
        }
      />
    </>
  )
}
