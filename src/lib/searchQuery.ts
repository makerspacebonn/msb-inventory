// Search queries can contain category and tag filters next to free text:
//   cat:"Elektrowerkzeug" tag:Akku bosch   or   cat:Elektro*
// A `*` matches any characters; matching ignores case.

export type ParsedSearch = {
  /** The free search text, with all filters removed */
  text: string
  /** Category names or patterns; an item matches if it is in any of them */
  categories: string[]
  /** Tag names or patterns; an item matches only if it has all of them */
  tags: string[]
}

// A filter must start a word, so e.g. "bobcat:x" stays plain text
const FILTER_TERM = /(?<!\S)(cat|tag):(?:"([^"]*)"|(\S+))/gi

export function parseSearchQuery(query: string): ParsedSearch {
  const categories: string[] = []
  const tags: string[] = []
  const text = query
    .replace(
      FILTER_TERM,
      (_match, kind: string, quoted?: string, bare?: string) => {
        const value = (quoted ?? bare ?? "").trim()
        if (value) {
          ;(kind.toLowerCase() === "cat" ? categories : tags).push(value)
        }
        return " "
      },
    )
    .replace(/\s+/g, " ")
    .trim()
  return { text, categories, tags }
}

/** The search term that finds all items of one category */
export function categorySearchTerm(category: string): string {
  return `cat:"${category}"`
}

/** The search term that finds all items with one tag */
export function tagSearchTerm(tag: string): string {
  return `tag:"${tag}"`
}

/** Builds a query string from filters and free text */
export function buildSearchQuery({
  text,
  categories,
  tags,
}: ParsedSearch): string {
  return [
    ...categories.map(categorySearchTerm),
    ...tags.map(tagSearchTerm),
    text,
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * Turns a filter pattern into an SQL ILIKE pattern: `*` becomes `%`, and
 * the characters LIKE treats specially (`%`, `_`, `\`) match literally.
 */
export function patternToLike(pattern: string): string {
  return pattern.replace(/[\\%_]/g, (char) => `\\${char}`).replace(/\*/g, "%")
}

/**
 * Tags that narrow down a list of search results: the most frequent tags
 * among the results, without the active tag filters and without tags every
 * result has (those wouldn't narrow anything). Ignores case.
 */
export function narrowingTags(
  results: { tags: string[] | null }[],
  activeTags: string[],
  limit = 12,
): string[] {
  const active = new Set(activeTags.map((tag) => tag.toLowerCase()))
  const counts = new Map<string, { tag: string; count: number }>()

  for (const result of results) {
    // Count each tag once per item, even if it's stored twice
    const itemTags = new Map(
      (result.tags ?? []).map((tag) => [tag.toLowerCase(), tag]),
    )
    for (const [key, tag] of itemTags) {
      if (active.has(key)) continue
      const entry = counts.get(key)
      if (entry) entry.count++
      else counts.set(key, { tag, count: 1 })
    }
  }

  return [...counts.values()]
    .filter(({ count }) => count < results.length)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "de"))
    .slice(0, limit)
    .map(({ tag }) => tag)
}
