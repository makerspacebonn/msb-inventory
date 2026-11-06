import { describe, expect, it } from "vitest"
import {
  berlinDay,
  dailyCounts,
  lastDays,
  parsePeriod,
  summarizeActivity,
} from "./activityStats"

describe("berlinDay", () => {
  it("uses the calendar day in Bonn, not in UTC", () => {
    // 23:30 UTC is already the next day in Germany (winter: UTC+1)
    expect(berlinDay(new Date("2026-11-05T23:30:00Z"))).toBe("2026-11-06")
    // Summer time: UTC+2
    expect(berlinDay(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01")
    expect(berlinDay(new Date("2026-07-01T22:00:00Z"))).toBe("2026-07-02")
  })
})

describe("lastDays", () => {
  it("lists the days of the period, oldest first, ending today", () => {
    expect(lastDays(3, new Date("2026-11-06T10:00:00Z"))).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ])
  })

  it("has every day once across a change of summer time", () => {
    const days = lastDays(3, new Date("2026-10-26T10:00:00Z"))
    expect(days).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"])
  })
})

describe("dailyCounts", () => {
  it("puts the counts on their days and fills days without activity", () => {
    const days = ["2026-11-04", "2026-11-05", "2026-11-06"]
    expect(
      dailyCounts(days, [
        { day: "2026-11-06", count: 4 },
        { day: "2026-11-04", count: 1 },
        { day: "2026-10-01", count: 9 },
      ]),
    ).toEqual([1, 0, 4])
  })
})

describe("parsePeriod", () => {
  it("accepts the offered periods and falls back to 30 days", () => {
    expect(parsePeriod(7)).toBe(7)
    expect(parsePeriod("90")).toBe(90)
    expect(parsePeriod(12)).toBe(30)
    expect(parsePeriod(undefined)).toBe(30)
  })
})

describe("summarizeActivity", () => {
  const days = ["2026-11-05", "2026-11-06"]

  it("makes one series per kind of change over the period", () => {
    const stats = summarizeActivity(
      days,
      [{ day: "2026-11-06", count: 7 }],
      [
        { day: "2026-11-05", changeType: "create", count: 2 },
        { day: "2026-11-06", changeType: "update", count: 3 },
        { day: "2026-11-06", changeType: "create", count: 1 },
      ],
      [],
    )

    expect(stats.searches).toEqual([0, 7])
    expect(stats.changes).toEqual({
      create: [2, 1],
      update: [0, 3],
      delete: [0, 0],
    })
  })

  it("lists people by activity, with unknown authors grouped", () => {
    const stats = summarizeActivity(
      days,
      [],
      [],
      [
        { userId: "u1", name: "Anna", changeType: "create", count: 2 },
        { userId: "u2", name: "Ben", changeType: "update", count: 5 },
        { userId: "u1", name: "Anna", changeType: "delete", count: 1 },
        { userId: null, name: null, changeType: "update", count: 1 },
      ],
    )

    expect(stats.people).toEqual([
      { name: "Ben", create: 0, update: 5, delete: 0, total: 5 },
      { name: "Anna", create: 2, update: 0, delete: 1, total: 3 },
      { name: "Unbekannt", create: 0, update: 1, delete: 0, total: 1 },
    ])
  })

  it("leaves out who did what when it wasn't loaded", () => {
    expect(summarizeActivity(days, [], [], null).people).toBeNull()
  })
})
