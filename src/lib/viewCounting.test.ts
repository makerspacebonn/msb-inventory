import { describe, expect, it } from "vitest"
import { isCrawler, RecentViews, viewerKey } from "./viewCounting"

const HOUR = 60 * 60 * 1000

describe("RecentViews", () => {
  it("counts a person's views of an item once per window", () => {
    const views = new RecentViews(HOUR)
    const start = 1_000_000

    expect(views.shouldCount("anna", 1, start)).toBe(true)
    expect(views.shouldCount("anna", 1, start + 1000)).toBe(false)
    expect(views.shouldCount("anna", 1, start + HOUR - 1)).toBe(false)
    // Reloading doesn't extend the window
    expect(views.shouldCount("anna", 1, start + HOUR)).toBe(true)
  })

  it("counts other people and other items separately", () => {
    const views = new RecentViews(HOUR)

    expect(views.shouldCount("anna", 1, 0)).toBe(true)
    expect(views.shouldCount("ben", 1, 0)).toBe(true)
    expect(views.shouldCount("anna", 2, 0)).toBe(true)
  })

  it("forgets views whose window has run out", () => {
    const views = new RecentViews(HOUR)
    views.shouldCount("anna", 1, 0)
    views.shouldCount("ben", 2, 0)

    views.shouldCount("carla", 3, 2 * HOUR)
    expect(views.size).toBe(1)
  })
})

describe("viewerKey", () => {
  const visitor = {
    userId: null,
    ip: "203.0.113.7",
    userAgent: "Firefox",
    day: "2026-11-06",
  }

  it("uses the user id of logged-in users", () => {
    expect(viewerKey({ ...visitor, userId: "u1" })).toBe("user:u1")
  })

  it("tells visitors apart without containing their IP address", () => {
    const key = viewerKey(visitor)

    expect(key).toBe(viewerKey(visitor))
    expect(key).not.toContain("203.0.113.7")
    expect(viewerKey({ ...visitor, userAgent: "Safari" })).not.toBe(key)
    expect(viewerKey({ ...visitor, ip: "203.0.113.8" })).not.toBe(key)
  })

  it("gives the same visitor a new key every day", () => {
    expect(viewerKey({ ...visitor, day: "2026-11-07" })).not.toBe(
      viewerKey(visitor),
    )
  })
})

describe("isCrawler", () => {
  it("recognizes crawlers, link previews and scripts", () => {
    for (const agent of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)",
      "Discordbot/2.0",
      "facebookexternalhit/1.1",
      "curl/8.7.1",
      "python-requests/2.32",
      "",
      null,
    ]) {
      expect(isCrawler(agent), String(agent)).toBe(true)
    }
  })

  it("lets browsers through, also headless ones in tests", () => {
    for (const agent of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
    ]) {
      expect(isCrawler(agent), agent).toBe(false)
    }
  })
})
