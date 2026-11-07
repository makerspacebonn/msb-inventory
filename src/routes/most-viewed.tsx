import { MostViewedList } from "@components/stats/MostViewedList"
import { createFileRoute, Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { fetchMostViewedItems } from "@/src/actions/statsActions"
import {
  parseViewPeriod,
  VIEW_PERIODS,
  type ViewPeriod,
} from "@/src/lib/activityStats"

const PERIOD_LABELS: Record<ViewPeriod, string> = {
  "7": "7 Tage",
  "30": "30 Tage",
  all: "Gesamt",
}

export const Route = createFileRoute("/most-viewed")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { period: ViewPeriod } => ({
    period: parseViewPeriod(search.period),
  }),
  loaderDeps: ({ search: { period } }) => ({ period }),
  loader: ({ deps: { period } }) => fetchMostViewedItems({ data: { period } }),
  head: () => ({ meta: [{ title: "Meistgesehen | MSB Inventar" }] }),
  component: MostViewedPage,
})

function MostViewedPage() {
  const items = Route.useLoaderData()
  const { period } = Route.useSearch()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Meistgesehen</h1>
        <nav aria-label="Zeitraum" className="flex gap-2">
          {VIEW_PERIODS.map((option) => (
            <Link
              key={option}
              to="/most-viewed"
              search={{ period: option }}
              aria-current={option === period ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                option === period
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {PERIOD_LABELS[option]}
            </Link>
          ))}
        </nav>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          In diesem Zeitraum wurde noch kein Item angesehen.
        </p>
      ) : (
        <MostViewedList
          items={items}
          label={`Meistgesehen (${PERIOD_LABELS[period]})`}
        />
      )}
    </div>
  )
}
