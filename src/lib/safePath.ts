import fs from "node:fs"
import path from "node:path"

/**
 * Resolves `rel` against `root` and returns the real path only when it is
 * the root itself or lies below it. Symlinks are followed, so a link that
 * points out of the root is rejected. Returns null for anything outside,
 * for missing files and when `root` is empty.
 *
 * `rel` is always treated as relative: "/etc/hosts" means <root>/etc/hosts.
 */
export function resolveInside(root: string, rel: string): string | null {
  if (!root || rel.includes("\0")) return null
  try {
    const realRoot = fs.realpathSync(root)
    // path.join, not path.resolve: resolve would let an absolute `rel` win
    const target = fs.realpathSync(path.join(realRoot, rel))
    if (target === realRoot || target.startsWith(realRoot + path.sep)) {
      return target
    }
    return null
  } catch {
    return null
  }
}
