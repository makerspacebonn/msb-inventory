// Day handling for the activity statistics. Days are calendar days in Bonn
// as "YYYY-MM-DD" strings, so they compare and sort as text and don't shift
// with the server's time zone

export const STATS_TIME_ZONE = "Europe/Berlin"

/** The periods the statistics page offers, in days */
export const STATS_PERIODS = [7, 30, 90] as const
export type StatsPeriod = (typeof STATS_PERIODS)[number]

const dayFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: STATS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** The calendar day in Bonn at the given moment */
export function berlinDay(moment: Date): string {
  // Swedish formats dates as YYYY-MM-DD
  return dayFormat.format(moment)
}

/** The days of a period ending today, oldest first */
export function lastDays(count: number, now: Date = new Date()): string[] {
  // Count back on the calendar date itself (as UTC midnight), so changes of
  // summer time can't skip or repeat a day
  const today = Date.parse(`${berlinDay(now)}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) =>
    new Date(today - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  )
}

/** One count per day of the period; days without activity count 0 */
export function dailyCounts(
  days: string[],
  rows: { day: string; count: number }[],
): number[] {
  const byDay = new Map(rows.map((row) => [row.day, row.count]))
  return days.map((day) => byDay.get(day) ?? 0)
}

export function parsePeriod(value: unknown): StatsPeriod {
  const days = Number(value)
  return STATS_PERIODS.find((period) => period === days) ?? 30
}

/** Periods for the most viewed items: the last 7 or 30 days, or all time */
export const VIEW_PERIODS = ["7", "30", "all"] as const
export type ViewPeriod = (typeof VIEW_PERIODS)[number]

export function parseViewPeriod(value: unknown): ViewPeriod {
  return VIEW_PERIODS.find((period) => period === String(value)) ?? "7"
}

/** The first day a period counts views from; null counts all of them */
export function viewPeriodStart(
  period: ViewPeriod,
  now: Date = new Date(),
): string | null {
  return period === "all" ? null : lastDays(Number(period), now)[0]
}

export type ChangeKind = "create" | "update" | "delete"

export type PersonActivity = {
  name: string
  create: number
  update: number
  delete: number
  total: number
}

export type ActivityStats = {
  days: string[]
  searches: number[]
  changes: Record<ChangeKind, number[]>
  /** Most active first; null for visitors, who don't see who did what */
  people: PersonActivity[] | null
}

/**
 * Brings the counted rows into one series per kind over the period, and
 * one row per person. Changes without a user (e.g. migrations) are
 * listed as "Unbekannt"
 */
export function summarizeActivity(
  days: string[],
  searches: { day: string; count: number }[],
  changes: { day: string; changeType: ChangeKind; count: number }[],
  perUser:
    | {
        userId: string | null
        name: string | null
        changeType: ChangeKind
        count: number
      }[]
    | null,
): ActivityStats {
  const kinds: ChangeKind[] = ["create", "update", "delete"]
  const series = Object.fromEntries(
    kinds.map((kind) => [
      kind,
      dailyCounts(
        days,
        changes.filter((row) => row.changeType === kind),
      ),
    ]),
  ) as Record<ChangeKind, number[]>

  const people = new Map<string, PersonActivity>()
  for (const row of perUser ?? []) {
    if (!kinds.includes(row.changeType)) continue
    const key = row.userId ?? ""
    const person = people.get(key) ?? {
      name: row.name || (row.userId ? "Gelöschter Benutzer" : "Unbekannt"),
      create: 0,
      update: 0,
      delete: 0,
      total: 0,
    }
    person[row.changeType] += row.count
    person.total += row.count
    people.set(key, person)
  }

  return {
    days,
    searches: dailyCounts(days, searches),
    changes: series,
    people: perUser
      ? [...people.values()].sort(
          (a, b) => b.total - a.total || a.name.localeCompare(b.name, "de"),
        )
      : null,
  }
}
