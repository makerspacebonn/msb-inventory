// Search queries can contain category filters next to free text:
//   cat:"Elektrowerkzeug" akku   or   cat:Elektro*
// A `*` in a category matches any characters; matching ignores case.

export type ParsedSearch = {
  /** The free search text, with all category filters removed */
  text: string
  /** Category names or patterns; an item matches if it is in any of them */
  categories: string[]
}

// `cat:` must start a word, so e.g. "bobcat:x" stays plain text
const CATEGORY_TERM = /(?<!\S)cat:(?:"([^"]*)"|(\S+))/gi

export function parseSearchQuery(query: string): ParsedSearch {
  const categories: string[] = []
  const text = query
    .replace(CATEGORY_TERM, (_match, quoted?: string, bare?: string) => {
      const category = (quoted ?? bare ?? "").trim()
      if (category) categories.push(category)
      return " "
    })
    .replace(/\s+/g, " ")
    .trim()
  return { text, categories }
}

/** The search term that finds all items of one category */
export function categorySearchTerm(category: string): string {
  return `cat:"${category}"`
}

/** Builds a query string from category filters and free text */
export function buildSearchQuery({ text, categories }: ParsedSearch): string {
  return [...categories.map(categorySearchTerm), text].filter(Boolean).join(" ")
}

/**
 * Turns a category pattern into an SQL ILIKE pattern: `*` becomes `%`, and
 * the characters LIKE treats specially (`%`, `_`, `\`) match literally.
 */
export function categoryPatternToLike(pattern: string): string {
  return pattern.replace(/[\\%_]/g, (char) => `\\${char}`).replace(/\*/g, "%")
}
