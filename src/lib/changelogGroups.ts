export type EntryGroup<T> = { main: T; others: T[] }

/**
 * Bundles the entries of one action, so a new image with dozens of moved
 * markers takes one line. A group sits where its newest entry is; the image
 * change leads it, as that's what the user did
 */
export function groupEntries<
  T extends { groupId: string | null; changedFields: string[] | null },
>(entries: T[]): EntryGroup<T>[] {
  const members = new Map<string, T[]>()
  for (const entry of entries) {
    if (entry.groupId) {
      members.set(entry.groupId, [...(members.get(entry.groupId) ?? []), entry])
    }
  }

  const seen = new Set<string>()
  const groups: EntryGroup<T>[] = []
  for (const entry of entries) {
    if (!entry.groupId) {
      groups.push({ main: entry, others: [] })
    } else if (!seen.has(entry.groupId)) {
      seen.add(entry.groupId)
      const all = members.get(entry.groupId) ?? []
      const main =
        all.find((e) => e.changedFields?.includes("imagePath")) ?? all[0]
      groups.push({ main, others: all.filter((e) => e !== main) })
    }
  }
  return groups
}
