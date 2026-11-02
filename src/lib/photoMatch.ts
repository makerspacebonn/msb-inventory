// Matching items against the AI description of a photo. The description
// uses the same vocabulary as the stored items (most item texts were
// generated from photos by the same model), so its words, category and
// tags are compared with the items'.

/** What the AI recognized on a search photo */
export type PhotoDescription = {
  name: string
  /** An existing category; null when the AI found none that fits */
  category: string | null
  tags: string[]
  manufacturer: string | null
  model: string | null
}

/** An item that shares at least one signal with the photo description */
export type PhotoCandidate = {
  category: string | null
  tags: string[] | null
  manufacturer: string | null
  model: string | null
  /** Full-text rank of the description's words in the item's text (0..1) */
  textRank: number
  /** Trigram similarity between the recognized name and the item name (0..1) */
  nameSimilarity: number
}

/** Below this score an item is not shown as a match */
export const MIN_PHOTO_SCORE = 1

// Tuned on 20 item photos from the real inventory, each searched with its
// own photo: 13 found at position 1, 17 within the first five
export const PHOTO_WEIGHTS = {
  text: 4,
  name: 4,
  category: 1,
  tag: 0.5,
  manufacturer: 0.75,
  model: 2,
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * The words to look for in the items' text: the recognized name plus all
 * tags, manufacturer and model, joined with "or" for websearch_to_tsquery
 */
export function photoSearchTerms(description: PhotoDescription): string {
  const words = [
    description.name,
    ...description.tags,
    description.manufacturer,
    description.model,
  ]
    .filter((word): word is string => !!word?.trim())
    // Quotes and minus signs have a meaning in websearch syntax
    .map((word) => word.replace(/["-]/g, " ").trim())
    .filter(Boolean)
  return [...new Set(words)].join(" or ")
}

/** How well an item matches the photo; higher is better */
export function scorePhotoMatch(
  candidate: PhotoCandidate,
  description: PhotoDescription,
  weights: typeof PHOTO_WEIGHTS = PHOTO_WEIGHTS,
): number {
  const itemTags = new Set(
    (candidate.tags ?? []).map((tag) => tag.trim().toLowerCase()),
  )
  const sharedTags = description.tags.filter((tag) =>
    itemTags.has(tag.trim().toLowerCase()),
  ).length

  return (
    weights.text * candidate.textRank +
    weights.name * candidate.nameSimilarity +
    (same(candidate.category, description.category) ? weights.category : 0) +
    weights.tag * sharedTags +
    (same(candidate.manufacturer, description.manufacturer)
      ? weights.manufacturer
      : 0) +
    (same(candidate.model, description.model) ? weights.model : 0)
  )
}

/**
 * Orders candidates by score, best first, and drops weak matches.
 * Items with the same score keep their order.
 */
export function rankPhotoMatches<T extends PhotoCandidate>(
  candidates: T[],
  description: PhotoDescription,
  limit = 24,
): (T & { score: number })[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scorePhotoMatch(candidate, description),
    }))
    .filter(({ score }) => score >= MIN_PHOTO_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** The fields of the AI item description that photo matching uses */
export type AiItemFields = {
  bezeichnung?: string | null
  kategorie?: string | null
  kategorie_neu?: string | null
  schlagworte?: string[] | null
  hersteller?: string | null
  modell?: string | null
}

export function toPhotoDescription(ai: AiItemFields): PhotoDescription {
  return {
    name: ai.bezeichnung?.trim() ?? "",
    // With a proposed new category, "kategorie" is only the fallback
    // ("Sonstiges"), which would match lots of unrelated items
    category: ai.kategorie_neu ? null : ai.kategorie?.trim() || null,
    tags: (ai.schlagworte ?? []).map((tag) => tag.trim()).filter(Boolean),
    manufacturer: ai.hersteller?.trim() || null,
    model: ai.modell?.trim() || null,
  }
}
