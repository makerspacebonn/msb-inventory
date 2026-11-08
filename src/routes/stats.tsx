import { type ChartSeries, LineChart } from "@components/stats/LineChart"
import { createFileRoute, Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { fetchActivityStats } from "@/src/actions/statsActions"
import {
  type ActivityStats,
  type ChangeKind,
  parsePeriod,
  STATS_PERIODS,
  type StatsPeriod,
} from "@/src/lib/activityStats"

export const Route = createFileRoute("/stats")({
  validateSearch: (search: Record<string, unknown>): { days: StatsPeriod } => ({
    days: parsePeriod(search.days),
  }),
  loaderDeps: ({ search: { days } }) => ({ days }),
  loader: ({ deps: { days } }) => fetchActivityStats({ data: days }),
  head: () => ({ meta: [{ title: "Aktivität | MSB Inventar" }] }),
  component: StatsPage,
})

// Same meaning as the changelog badges: green added, blue changed, red
// deleted. These steps are validated against the dark surface, including
// for red-green color blindness; a lighter green or an orange falls below
// the checks next to this red
const CHANGE_LINES: { kind: ChangeKind; label: string; color: string }[] = [
  { kind: "create", label: "Hinzugefügt", color: "#008300" },
  { kind: "update", label: "Geändert", color: "#3987e5" },
  { kind: "delete", label: "Gelöscht", color: "#e66767" },
]
// Charts with a single line use one color
const SINGLE_LINE_COLOR = "#3987e5"

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

function StatsPage() {
  const stats = Route.useLoaderData()
  const { days } = Route.useSearch()

  const changeSeries: ChartSeries[] = CHANGE_LINES.map((line) => ({
    key: line.kind,
    label: line.label,
    color: line.color,
    values: stats.changes[line.kind],
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Aktivität</h1>
        {/* One filter above everything it scopes */}
        <nav aria-label="Zeitraum" className="flex gap-2">
          {STATS_PERIODS.map((period) => (
            <Link
              key={period}
              to="/stats"
              search={{ days: period }}
              aria-current={period === days ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                period === days
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {period} Tage
            </Link>
          ))}
        </nav>
      </div>

      <ul
        aria-label={`Summen der letzten ${days} Tage`}
        className="grid grid-cols-2 gap-3 md:grid-cols-5"
      >
        <Total label="Suchen" value={sum(stats.searches)} />
        <Total label="Aufrufe" value={sum(stats.views)} />
        {CHANGE_LINES.map((line) => (
          <Total
            key={line.kind}
            label={line.label}
            value={sum(stats.changes[line.kind])}
          />
        ))}
      </ul>

      <LineChart
        title="Suchen pro Tag"
        days={stats.days}
        series={[
          {
            key: "searches",
            label: "Suchen",
            color: SINGLE_LINE_COLOR,
            values: stats.searches,
          },
        ]}
      />
      <p className="-mt-6 text-xs text-muted-foreground">
        Gezählt werden Suchen über die Suchleiste, Klicks auf Schlagworte und
        Fotosuchen, ohne Suchbegriff und ohne Person. Crawler zählen nicht.
      </p>

      <LineChart
        title="Aufrufe pro Tag"
        days={stats.days}
        series={[
          {
            key: "views",
            label: "Aufrufe",
            color: SINGLE_LINE_COLOR,
            values: stats.views,
          },
        ]}
      />
      <p className="-mt-6 text-xs text-muted-foreground">
        Aufrufe von Item-Seiten, alle Items zusammen. Wer ein Item mehrmals in
        einer Stunde öffnet, zählt einmal; Crawler zählen nicht.
      </p>

      <LineChart
        title="Änderungen pro Tag"
        days={stats.days}
        series={changeSeries}
      />

      {stats.people && <PeopleTable people={stats.people} days={days} />}
    </div>
  )
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <li className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value.toLocaleString("de-DE")}</div>
    </li>
  )
}

function PeopleTable({
  people,
  days,
}: {
  people: NonNullable<ActivityStats["people"]>
  days: number
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-medium">Änderungen pro Person</h2>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine Änderungen in den letzten {days} Tagen.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">
              Änderungen pro Person in den letzten {days} Tagen
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">
                  Person
                </th>
                {CHANGE_LINES.map((line) => (
                  <th
                    key={line.kind}
                    scope="col"
                    className="py-1 pr-4 text-right font-medium"
                  >
                    {line.label}
                  </th>
                ))}
                <th scope="col" className="py-1 text-right font-medium">
                  Gesamt
                </th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.name} className="border-t">
                  <th scope="row" className="py-1.5 pr-4 font-normal">
                    {person.name}
                  </th>
                  {CHANGE_LINES.map((line) => (
                    <td key={line.kind} className="py-1.5 pr-4 text-right">
                      {person[line.kind].toLocaleString("de-DE")}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-semibold">
                    {person.total.toLocaleString("de-DE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
