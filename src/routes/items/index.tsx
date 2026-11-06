import { ItemList } from "@components/ItemList"
import { Badge, badgeVariants } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { fetchPaginatedItems, searchInventory } from "@/src/actions/itemActions"
import type { Item, PaginatedResult } from "@/src/app/types"
import {
  buildSearchQuery,
  narrowingTags,
  type ParsedSearch,
  parseSearchQuery,
} from "@/src/lib/searchQuery"

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
      return { q, results: await searchInventory({ data: q }) }
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
  const parsed = parseSearchQuery(q)
  const { text, categories, tags } = parsed
  const resultCount = `${results.length} Ergebnis${results.length !== 1 ? "se" : ""}`
  const narrowing = narrowingTags(results, tags)
  const searchWith = (changes: Partial<ParsedSearch>) =>
    buildSearchQuery({ ...parsed, ...changes }) || undefined

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-sm text-muted-foreground">
          {text ? `${resultCount} für "${text}"` : resultCount}
        </p>
        {categories.map((category) => (
          <FilterChip
            key={`cat:${category}`}
            label={`Kategorie: ${category}`}
            removeLabel={`Kategorie-Filter "${category}" entfernen`}
            searchWithout={searchWith({
              categories: categories.filter((c) => c !== category),
            })}
          />
        ))}
        {tags.map((tag) => (
          <FilterChip
            key={`tag:${tag}`}
            label={`Schlagwort: ${tag}`}
            removeLabel={`Schlagwort-Filter "${tag}" entfernen`}
            searchWithout={searchWith({ tags: tags.filter((t) => t !== tag) })}
          />
        ))}
        {tags.length > 1 && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/items" search={{ q: searchWith({ tags: [] }) }}>
              <XIcon className="h-4 w-4 mr-1" />
              Alle Schlagwort-Filter entfernen
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/items">
            <XIcon className="h-4 w-4 mr-1" />
            Alle Items anzeigen
          </Link>
        </Button>
      </div>
      {narrowing.length > 0 && (
        <nav
          aria-label="Nach Schlagwort eingrenzen"
          className="flex flex-wrap items-center gap-2 mb-4"
        >
          <span className="text-sm text-muted-foreground">Eingrenzen:</span>
          {narrowing.map((tag) => (
            <Link
              key={tag}
              to="/items"
              search={{ q: searchWith({ tags: [...tags, tag] }) }}
              aria-label={`Nach Schlagwort "${tag}" eingrenzen`}
              className={cn(
                badgeVariants({ variant: "outline" }),
                "font-normal text-muted-foreground hover:border-brand hover:bg-brand hover:text-white",
              )}
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              {tag}
            </Link>
          ))}
        </nav>
      )}
      <ItemList items={results} />
    </>
  )
}

// An active search filter with a button that removes just this filter
function FilterChip({
  label,
  removeLabel,
  searchWithout,
}: {
  label: string
  removeLabel: string
  searchWithout: string | undefined
}) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-normal">
      {label}
      <Link
        to="/items"
        search={{ q: searchWithout }}
        aria-label={removeLabel}
        className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
      >
        <XIcon className="h-3 w-3" />
      </Link>
    </Badge>
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
