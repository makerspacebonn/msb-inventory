/**
 * Compares two values structurally, so arrays and objects (tags, links,
 * location markers) are equal when their content is equal
 */
export function isSameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Returns the keys whose values differ between two snapshots of an entity */
export function diffFields<T extends object>(
  before: T,
  after: T,
  keys: readonly string[],
): string[] {
  return keys.filter(
    (key) => !isSameValue(before[key as keyof T], after[key as keyof T]),
  )
}
