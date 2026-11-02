// TEMPORARY: one-time category and tag migration (AI-001/AI-002).
// Pure planning logic: computes every change without touching the database,
// so the preview and the actual run use exactly the same result.

import { buildCanonicalSpellings, cleanTags } from "@/src/lib/tagRules"
import {
  CATEGORY_MAP,
  CURATED_CATEGORIES,
  ITEM_OVERRIDES,
  type ItemOverride,
} from "./categoryMapping"

export const MIGRATION_ID = "2026-11-categories-and-tags"

export type MigrationItem = {
  id: number
  name: string
  category: string | null
  tags: string[] | null
  manufacturer: string | null
}

export type ItemChange = {
  id: number
  name: string
  before: { category: string | null; tags: string[] }
  after: { category: string | null; tags: string[] }
  changedFields: ("category" | "tags")[]
  removedTags: string[]
  viaOverride: boolean
}

export type MigrationPlan = {
  changes: ItemChange[]
  // Categories the table must contain afterwards (curated + kept unknown)
  categories: string[]
  // Categories not covered by the mapping; kept as they are
  unknownCategories: { name: string; count: number }[]
  skippedOverrides: { override: ItemOverride; reason: string }[]
  categoryCounts: { name: string; count: number }[]
  tagStats: { distinctBefore: number; distinctAfter: number; removed: number }
}

const lower = (value: string) => value.trim().toLowerCase()

const mapByLowerName = new Map(
  Object.entries(CATEGORY_MAP).map(([from, to]) => [lower(from), to]),
)
const curatedByLowerName = new Map(CURATED_CATEGORIES.map((c) => [lower(c), c]))

function checkOverride(
  item: MigrationItem,
  override: ItemOverride,
): string | null {
  if (!item.name.startsWith(override.namePrefix)) {
    return `Name passt nicht ("${item.name}")`
  }
  if (item.category?.trim() !== override.from) {
    return `Kategorie passt nicht ("${item.category ?? ""}")`
  }
  return null
}

export function planMigration(items: MigrationItem[]): MigrationPlan {
  const overridesById = new Map(ITEM_OVERRIDES.map((o) => [o.id, o]))
  const skippedOverrides: MigrationPlan["skippedOverrides"] = []
  const unknown = new Map<string, number>()

  // Overrides whose item doesn't exist in this dataset
  const itemIds = new Set(items.map((i) => i.id))
  for (const override of ITEM_OVERRIDES) {
    if (!itemIds.has(override.id)) {
      skippedOverrides.push({ override, reason: "Item nicht vorhanden" })
    }
  }

  const canonical = buildCanonicalSpellings(items.flatMap((i) => i.tags ?? []))

  const changes: ItemChange[] = []
  const categoryCounts = new Map<string, number>()
  const tagsAfter: string[] = []
  let tagsBefore = 0

  for (const item of items) {
    const oldCategory = item.category?.trim() ? item.category.trim() : null
    let newCategory = oldCategory
    let viaOverride = false

    if (oldCategory) {
      const override = overridesById.get(item.id)
      const overrideProblem = override ? checkOverride(item, override) : null
      if (override && !overrideProblem) {
        newCategory = override.to
        viaOverride = true
      } else {
        if (override && overrideProblem) {
          skippedOverrides.push({ override, reason: overrideProblem })
        }
        const key = lower(oldCategory)
        newCategory =
          mapByLowerName.get(key) ?? curatedByLowerName.get(key) ?? oldCategory
        if (!mapByLowerName.has(key) && !curatedByLowerName.has(key)) {
          unknown.set(oldCategory, (unknown.get(oldCategory) ?? 0) + 1)
        }
      }
      categoryCounts.set(
        newCategory,
        (categoryCounts.get(newCategory) ?? 0) + 1,
      )
    }

    const oldTags = item.tags ?? []
    tagsBefore += oldTags.length
    const newTags = cleanTags(oldTags, {
      redundant: [oldCategory, newCategory, item.manufacturer],
      canonical,
    })
    tagsAfter.push(...newTags)

    const changedFields: ItemChange["changedFields"] = []
    if (newCategory !== item.category) changedFields.push("category")
    if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) {
      changedFields.push("tags")
    }
    if (changedFields.length === 0) continue

    const keptKeys = new Set(newTags.map(lower))
    changes.push({
      id: item.id,
      name: item.name,
      before: { category: item.category, tags: oldTags },
      after: { category: newCategory, tags: newTags },
      changedFields,
      removedTags: oldTags.filter((t) => !keptKeys.has(lower(t))),
      viaOverride,
    })
  }

  const unknownCategories = [...unknown]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    changes,
    categories: [
      ...CURATED_CATEGORIES,
      ...unknownCategories.map((u) => u.name),
    ],
    unknownCategories,
    skippedOverrides,
    categoryCounts: [...categoryCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    tagStats: {
      distinctBefore: new Set(items.flatMap((i) => i.tags ?? []).map(lower))
        .size,
      distinctAfter: new Set(tagsAfter.map(lower)).size,
      removed: tagsBefore - tagsAfter.length,
    },
  }
}
