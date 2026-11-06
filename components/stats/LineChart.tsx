import { useEffect, useId, useRef, useState } from "react"

export type ChartSeries = {
  key: string
  label: string
  /** Validated against the dark surface (see the activity page) */
  color: string
  values: number[]
}

type LineChartProps = {
  title: string
  /** Calendar days (YYYY-MM-DD), one per value */
  days: string[]
  /** Legend order; where lines overlap, the first one is in front */
  series: ChartSeries[]
}

const HEIGHT = 200
const PAD = { top: 12, right: 12, bottom: 24, left: 36 }
// Chart chrome for the dark surface: recessive hairlines
const GRID = "#2c2c2a"
const BASELINE = "#383835"

/** "05.11." */
function shortDate(day: string) {
  const [, month, date] = day.split("-")
  return `${date}.${month}.`
}

/** "Do., 05.11.2026" */
function longDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
}

/** "Do., 05.11.2026: 3 Hinzugefügt, 1 Geändert" */
function dayText(days: string[], series: ChartSeries[], index: number) {
  if (!days[index]) return ""
  const values = series
    .map((s) => `${(s.values[index] ?? 0).toLocaleString("de-DE")} ${s.label}`)
    .join(", ")
  return `${longDate(days[index])}: ${values}`
}

/** Clean axis steps (1, 2, 5 × 10^n) with at most five ticks above zero */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const rough = max / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step =
    [1, 2, 5, 10].map((f) => f * power).find((s) => s >= rough) ?? power * 10
  const top = Math.max(step, Math.ceil(max / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v))
  return ticks
}

/** A few evenly spread days for the x axis, always the first and last */
function xLabelIndexes(count: number, width: number): number[] {
  const slots = Math.max(2, Math.min(count, Math.floor(width / 110)))
  if (count <= 1) return [0]
  return [
    ...new Set(
      Array.from({ length: slots }, (_, i) =>
        Math.round((i * (count - 1)) / (slots - 1)),
      ),
    ),
  ]
}

/**
 * Values per day as lines, for the activity statistics. Hover or the arrow
 * keys show all values of a day; the table below has every value without
 * hovering
 */
export function LineChart({ title, days, series }: LineChartProps) {
  const wrapper = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const titleId = useId()

  useEffect(() => {
    const element = wrapper.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const max = Math.max(0, ...series.flatMap((s) => s.values))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const plotWidth = Math.max(0, width - PAD.left - PAD.right)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) =>
    PAD.left + (days.length > 1 ? (i / (days.length - 1)) * plotWidth : 0)
  const y = (v: number) => PAD.top + plotHeight - (v / top) * plotHeight
  const path = (values: number[]) =>
    values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("")

  // The crosshair snaps to the nearest day; readers aim at a date
  const pick = (clientX: number) => {
    const rect = wrapper.current?.getBoundingClientRect()
    if (!rect || days.length === 0) return
    const ratio = (clientX - rect.left - PAD.left) / (plotWidth || 1)
    const index = Math.round(ratio * (days.length - 1))
    setActive(Math.min(days.length - 1, Math.max(0, index)))
  }

  const last = days.length - 1
  // SVG paints in order, so the first series ends up in front
  const backToFront = [...series].reverse()
  const shown = active ?? null
  const tooltipLeft =
    shown === null ? 0 : Math.min(Math.max(x(shown) - 80, 0), width - 160)

  return (
    <figure className="space-y-3" aria-labelledby={titleId}>
      <figcaption id={titleId} className="font-medium">
        {title}
      </figcaption>

      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      {/* A slider over the days: the arrow keys pick a day, and screen
          readers announce its values */}
      <div
        ref={wrapper}
        role="slider"
        aria-label={`${title}, Tag wählen`}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={shown ?? last}
        aria-valuetext={dayText(days, series, shown ?? last)}
        tabIndex={0}
        className="relative touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height: HEIGHT }}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((i) => i ?? last)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault()
            const step = e.key === "ArrowLeft" ? -1 : 1
            setActive((i) => Math.min(last, Math.max(0, (i ?? last) + step)))
          } else if (e.key === "Home") {
            e.preventDefault()
            setActive(0)
          } else if (e.key === "End") {
            e.preventDefault()
            setActive(last)
          } else if (e.key === "Escape") {
            setActive(null)
          }
        }}
      >
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            aria-hidden="true"
            className="block overflow-visible"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? BASELINE : GRID}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {tick.toLocaleString("de-DE")}
                </text>
              </g>
            ))}
            {xLabelIndexes(days.length, plotWidth).map((i) => (
              <text
                key={days[i]}
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {shortDate(days[i])}
              </text>
            ))}

            {series.length === 1 && (
              <path
                d={`${path(series[0].values)}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`}
                fill={series[0].color}
                fillOpacity={0.1}
              />
            )}
            {backToFront.map((s) => (
              <path
                key={s.key}
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {shown !== null && (
              <line
                x1={x(shown)}
                x2={x(shown)}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke={BASELINE}
                strokeWidth={1}
              />
            )}
            {/* Today's value, or the selected day's, as dots with a ring in
                the surface color, so they stay apart where lines cross */}
            {backToFront.map((s) => (
              <circle
                key={s.key}
                cx={x(shown ?? last)}
                cy={y(s.values[shown ?? last] ?? 0)}
                r={4}
                fill={s.color}
                stroke="var(--background)"
                strokeWidth={2}
              />
            ))}
          </svg>
        )}

        {shown !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-10 w-40 rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
            style={{ left: tooltipLeft }}
          >
            <div className="mb-1 text-xs text-muted-foreground">
              {longDate(days[shown])}
            </div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-semibold tabular-nums">
                  {s.values[shown].toLocaleString("de-DE")}
                </span>
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Als Tabelle anzeigen
        </summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-background">
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">
                  Tag
                </th>
                {series.map((s) => (
                  <th
                    key={s.key}
                    scope="col"
                    className="py-1 pr-4 text-right font-medium"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => {
                const i = days.indexOf(day)
                return (
                  <tr key={day} className="border-t">
                    <th scope="row" className="py-1 pr-4 font-normal">
                      {longDate(day)}
                    </th>
                    {series.map((s) => (
                      <td key={s.key} className="py-1 pr-4 text-right">
                        {s.values[i].toLocaleString("de-DE")}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
