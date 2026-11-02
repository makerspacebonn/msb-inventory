import { ItemList } from "@components/ItemList"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"
import { XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { fetchPaginatedItems, searchItems } from "@/src/actions/itemActions"
import type { Item, PaginatedResult } from "@/src/app/types"
import { buildSearchQuery, parseSearchQuery } from "@/src/lib/searchQuery"

export const Route = createFileRoute("/items/")({
  component: RouteComponent,
  // Optional ?q= search term, set by the search bar in the header
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q:
      typeof search.q === "string" && search.q.trim() !== ""
        ? search.q.trim()
        : undefined,
  }),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: async ({ deps: { q } }) => {
    if (q) {
      return { q, results: await searchItems({ data: q }) }
    }
    return {
      q: undefined,
      firstPage: await fetchPaginatedItems({ data: { page: 1, pageSize: 24 } }),
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.q
          ? `Suche "${loaderData.q}" | Items | MSB Inventar`
          : "Items | MSB Inventar",
      },
    ],
  }),
})

function RouteComponent() {
  const data = Route.useLoaderData()

  if (data.q !== undefined) {
    return <SearchResults q={data.q} results={data.results} />
  }
  return <AllItems firstPage={data.firstPage} />
}

function SearchResults({ q, results }: { q: string; results: Item[] }) {
  const { text, categories } = parseSearchQuery(q)
  const resultCount = `${results.length} Ergebnis${results.length !== 1 ? "se" : ""}`

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-sm text-muted-foreground">
          {text ? `${resultCount} für "${text}"` : resultCount}
        </p>
        {categories.map((category) => {
          const remaining = buildSearchQuery({
            text,
            categories: categories.filter((c) => c !== category),
          })
          return (
            <Badge
              key={category}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              Kategorie: {category}
              <Link
                to="/items"
                search={{ q: remaining || undefined }}
                aria-label={`Kategorie-Filter "${category}" entfernen`}
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <XIcon className="h-3 w-3" />
              </Link>
            </Badge>
          )
        })}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/items">
            <XIcon className="h-4 w-4 mr-1" />
            Alle Items anzeigen
          </Link>
        </Button>
      </div>
      <ItemList items={results} />
    </>
  )
}

function AllItems({ firstPage }: { firstPage: PaginatedResult<Item> }) {
  const [items, setItems] = useState<Item[]>(firstPage.items)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(firstPage.page < firstPage.totalPages)
  const [isLoading, setIsLoading] = useState(false)

  // Start over when the loader delivers a fresh first page
  useEffect(() => {
    setItems(firstPage.items)
    setPage(1)
    setHasMore(firstPage.page < firstPage.totalPages)
  }, [firstPage])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      const result = await fetchPaginatedItems({
        data: { page: nextPage, pageSize: 24 },
      })
      setItems((prev) => [...prev, ...result.items])
      setPage(nextPage)
      setHasMore(nextPage < result.totalPages)
    } catch (error) {
      console.error("Failed to load more items:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page])

  return (
    <ItemList
      items={items}
      infiniteScroll={{ hasMore, isLoading, onLoadMore: loadMore }}
    />
  )
}
