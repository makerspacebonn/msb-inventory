import { createHash, randomBytes } from "node:crypto"

/** A person's views of one item count once per this window */
export const VIEW_WINDOW_MS = 60 * 60 * 1000

/**
 * Remembers which person saw which item recently, in memory only: nothing
 * about the viewer is stored. A restart forgets it, which at worst counts
 * one extra view
 */
export class RecentViews {
  private seen = new Map<string, number>()
  private lastCleanup = 0

  constructor(private readonly windowMs = VIEW_WINDOW_MS) {}

  /** Whether this view counts; the window starts with the counted view */
  shouldCount(viewer: string, itemId: number, now = Date.now()): boolean {
    this.cleanUp(now)
    const key = `${viewer}|${itemId}`
    const last = this.seen.get(key)
    if (last !== undefined && now - last < this.windowMs) return false
    this.seen.set(key, now)
    return true
  }

  get size() {
    return this.seen.size
  }

  // At most once per window, drop what has run out, so memory stays small
  private cleanUp(now: number) {
    if (now - this.lastCleanup < this.windowMs) return
    this.lastCleanup = now
    for (const [key, time] of this.seen) {
      if (now - time >= this.windowMs) this.seen.delete(key)
    }
  }
}

// A new random salt for each server start; with the day mixed in, the same
// visitor gets a different key every day, and keys can't be traced back
const salt = randomBytes(16).toString("hex")

/**
 * Who is viewing: the user id when logged in, otherwise a hash of IP
 * address and browser. No cookie is needed, so there's nothing to consent
 * to, and the IP address itself is never kept
 */
export function viewerKey(viewer: {
  userId: string | null
  ip: string | undefined
  userAgent: string | null
  day: string
}): string {
  if (viewer.userId) return `user:${viewer.userId}`
  const hash = createHash("sha256")
    .update(
      `${salt}|${viewer.day}|${viewer.ip ?? ""}|${viewer.userAgent ?? ""}`,
    )
    .digest("hex")
  return `visitor:${hash}`
}

// Words that crawlers, link previews and monitoring put in their user agent.
// Browsers driven by tests ("HeadlessChrome") are not crawlers
const CRAWLER =
  /bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python-requests|httpclient|monitor/i

/**
 * Whether a request comes from a crawler rather than a person's browser.
 * Searches and views of crawlers aren't counted
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  return !userAgent || CRAWLER.test(userAgent)
}
