/**
 * Rules for item tags, shared by the AI analysis and the one-time tag cleanup.
 *
 * Tags should help to find an item. Colors, materials and generic words
 * (already covered by the category) don't, so they are removed.
 */

const COLORS = [
  "schwarz",
  "weiß",
  "weiss",
  "grau",
  "rot",
  "blau",
  "grün",
  "gruen",
  "gelb",
  "silber",
  "orange",
  "braun",
  "lila",
  "violett",
  "pink",
  "rosa",
  "gold",
  "beige",
  "türkis",
  "transparent",
  "bunt",
  "mehrfarbig",
]

const MATERIALS = [
  "metall",
  "kunststoff",
  "plastik",
  "aluminium",
  "holz",
  "gummi",
  "stahl",
  "edelstahl",
  "glas",
]

const GENERIC = [
  "elektronik",
  // former category names, generic once the curated categories exist
  "elektronikbauteil",
  "elektronikbauteile",
  "elektronikkomponente",
  "elektronikkomponenten",
  "elektronik-komponente",
  "elektronik-komponenten",
  "elektronikmodul",
  "elektronik-modul",
  "elektronikzubehör",
  "elektronik-zubehör",
  "modul",
  "module",
  "prototyping",
  "diy",
  "digital",
  "werkzeug",
  "komponente",
  "komponenten",
  "bauteil",
  "bauteile",
  "basteln",
  "technik",
  "hobby",
  "set",
  "zubehör",
  "gerät",
]

const STOP_TAGS = new Set([...COLORS, ...MATERIALS, ...GENERIC])

const normalize = (tag: string) => tag.trim().toLowerCase()

export function isStopTag(tag: string): boolean {
  return STOP_TAGS.has(normalize(tag))
}

/**
 * Picks one spelling per tag (case-insensitive): the most used one,
 * on a tie the one seen first. Returns lowercase tag → spelling.
 */
export function buildCanonicalSpellings(
  allTags: string[],
): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()
  for (const raw of allTags) {
    const tag = raw.trim()
    if (!tag) continue
    const key = normalize(tag)
    const spellings = counts.get(key) ?? new Map<string, number>()
    spellings.set(tag, (spellings.get(tag) ?? 0) + 1)
    counts.set(key, spellings)
  }

  const canonical = new Map<string, string>()
  for (const [key, spellings] of counts) {
    let best = ""
    let bestCount = 0
    for (const [spelling, count] of spellings) {
      if (count > bestCount) {
        best = spelling
        bestCount = count
      }
    }
    canonical.set(key, best)
  }
  return canonical
}

type CleanTagsOptions = {
  // Values already stored elsewhere on the item, e.g. category and manufacturer
  redundant?: (string | null | undefined)[]
  canonical?: Map<string, string>
}

/**
 * Removes stop tags and tags that repeat other item fields,
 * unifies spellings and drops duplicates. Keeps the original order.
 */
export function cleanTags(
  tags: string[],
  { redundant: redundantValues = [], canonical }: CleanTagsOptions = {},
): string[] {
  const redundant = new Set(
    redundantValues.filter((v): v is string => !!v).map(normalize),
  )
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of tags) {
    const tag = raw.trim()
    const key = normalize(tag)
    if (!tag || STOP_TAGS.has(key) || redundant.has(key) || seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(canonical?.get(key) ?? tag)
  }
  return result
}
