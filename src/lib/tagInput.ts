// Rules for adding tags to an item, shared by the tag picker and its tests

const same = (a: string, b: string) =>
  a.localeCompare(b, "de", { sensitivity: "accent" }) === 0

/** Suggestions without the tags the item already has */
export function suggestionsFor(
  suggestions: string[],
  current: string[],
): string[] {
  return suggestions.filter((tag) => !current.some((c) => same(c, tag)))
}

/**
 * Adds typed text as a tag. An existing tag with the same spelling apart
 * from case is used instead, so "akku" doesn't become a second "Akku".
 * Returns the unchanged list for empty text or a tag the item already has.
 */
export function addTag(
  current: string[],
  text: string,
  suggestions: string[] = [],
): string[] {
  const typed = text.trim().replace(/\s+/g, " ")
  if (!typed || current.some((tag) => same(tag, typed))) return current
  const existing = suggestions.find((tag) => same(tag, typed))
  return [...current, existing ?? typed]
}

/** Adds several tags (e.g. the AI's suggestions), keeping the existing ones */
export function addTags(
  current: string[],
  texts: string[],
  suggestions: string[] = [],
): string[] {
  return texts.reduce((tags, text) => addTag(tags, text, suggestions), current)
}
