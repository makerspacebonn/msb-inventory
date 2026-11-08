import { Input } from "@components/ui/input"
import { Link, useNavigate } from "@tanstack/react-router"
import { PackageIcon, SearchIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { searchItems } from "@/src/actions/itemActions"
import { countSearch } from "@/src/actions/statsActions"
import type { Item } from "@/src/app/types"
import { useDebounce } from "@/src/hooks/useDebounce"

const MAX_RESULTS = 6

// Search bar in the header. Shows the best matches while typing;
// Enter or "Alle Ergebnisse anzeigen" opens the full search on /items.
export function HeaderSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Item[] | null>(null)
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query.trim(), 250)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null)
      return
    }
    // Ignore answers for queries the user has already typed past
    let current = true
    searchItems({ data: debouncedQuery }).then((found) => {
      if (current) setResults(found)
    })
    return () => {
      current = false
    }
  }, [debouncedQuery])

  // Close the results when clicking anywhere else
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  const reset = () => {
    setQuery("")
    setResults(null)
    setOpen(false)
  }

  const showAllResults = async () => {
    const q = query.trim()
    if (!q) return
    reset()
    void countSearch()
    await navigate({ to: "/items", search: { q } })
  }

  const showPanel = open && query.trim() !== ""

  return (
    <search className="flex-1 min-w-0 md:mx-4">
      <form
        ref={containerRef}
        className="relative"
        onSubmit={(e) => {
          e.preventDefault()
          void showAllResults()
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && showPanel) {
            setOpen(false)
            inputRef.current?.focus()
          }
        }}
      >
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          aria-label="Items suchen"
          aria-controls={panelId}
          aria-expanded={showPanel}
          placeholder="Suchen..."
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />

        {showPanel && (
          <div
            id={panelId}
            className="fixed inset-x-2 top-14 z-50 md:absolute md:inset-x-0 md:top-full md:mt-1 rounded-lg border bg-background shadow-lg overflow-hidden"
          >
            {results === null ? (
              <p className="p-3 text-sm text-muted-foreground">Suche...</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Keine Items gefunden
              </p>
            ) : (
              <ul aria-label="Suchergebnisse">
                {results.slice(0, MAX_RESULTS).map((item) => (
                  <li key={item.id}>
                    <Link
                      to="/i/$itemId"
                      params={{ itemId: item.id.toString() }}
                      onClick={reset}
                      className="flex items-center gap-3 p-2 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      {item.imagePath ? (
                        <img
                          src={`/img/items/${item.imagePath}`}
                          alt=""
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <PackageIcon
                            className="w-5 h-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {item.name}
                        </span>
                        {item.locationName && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.locationName}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/items"
              search={{ q: query.trim() }}
              onClick={reset}
              className="block border-t p-2 text-center text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              Alle Ergebnisse anzeigen
            </Link>
          </div>
        )}
      </form>
    </search>
  )
}
