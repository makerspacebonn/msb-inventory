import { ItemList } from "@components/ItemList"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { createFileRoute, Link } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Loader2, Search, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { searchItems } from "@/src/actions/itemActions"
import type { Item } from "@/src/app/types"
import { ItemRepository } from "@/src/repositories/ItemRepository"

const itemLoader = createServerFn().handler(async () => {
  return await new ItemRepository().findRecentItems(50)
})

export const Route = createFileRoute("/items/")({
  component: RouteComponent,
  loader: () => itemLoader(),
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
  const initialItems = Route.useLoaderData()
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<Item[]>(initialItems)
  const [isSearching, setIsSearching] = useState(false)

  const debouncedQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim() === "") {
        setItems(initialItems)
        return
      }

      setIsSearching(true)
      try {
        const results = await searchItems({ data: debouncedQuery })
        console.log(results)
        setItems(results)
      } catch (error) {
        console.error("Search failed:", error)
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [debouncedQuery, initialItems])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setItems(initialItems)
  }, [initialItems])

  return (
    <>
      <h1>Items</h1>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Suchen nach Name, Beschreibung, Hersteller, Tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
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
        <Button variant="outline" asChild>
          <Link to="/items/add">Add Item</Link>
        </Button>
      </div>
      {searchQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          {items.length} Ergebnis{items.length !== 1 ? "se" : ""} für "
          {searchQuery}"
        </p>
      )}
      <ItemList items={items} />
    </>
  )
}
