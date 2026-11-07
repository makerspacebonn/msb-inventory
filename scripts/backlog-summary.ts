/**
 * Writes docs/BacklogSummary.md: the open backlog items in one short list,
 * grouped by priority. Run after changing docs/Backlog.md:
 *   bun run backlog:summary
 */
import { readFileSync, writeFileSync } from "node:fs"

const BACKLOG = "docs/Backlog.md"
const SUMMARY = "docs/BacklogSummary.md"
const PRIORITIES = ["High", "Medium", "Low"]

const items: { title: string; priority: string }[] = []
let title: string | null = null
for (const line of readFileSync(BACKLOG, "utf8").split("\n")) {
  const heading = line.match(/^### (.+)$/)
  if (heading) title = heading[1].trim()
  const priority = line.match(/^\*\*Priority:\*\*\s*(\w+)/)
  if (priority && title) {
    items.push({ title, priority: priority[1] })
    title = null
  }
}

const known = new Set(PRIORITIES)
const groups = [...PRIORITIES, "Other"].map((priority) => ({
  priority,
  titles: items
    .filter((item) =>
      priority === "Other"
        ? !known.has(item.priority)
        : item.priority === priority,
    )
    .map((item) => item.title),
}))

const lines = [
  "# Backlog Summary",
  "",
  `Generated from [Backlog.md](./Backlog.md) with \`bun run backlog:summary\`; don't edit by hand.`,
  "",
  `**${items.length} open items**`,
]
for (const { priority, titles } of groups) {
  if (titles.length === 0) continue
  lines.push("", `## ${priority} (${titles.length})`, "")
  lines.push(...titles.map((t) => `- ${t}`))
}
writeFileSync(SUMMARY, `${lines.join("\n")}\n`)
console.log(`${SUMMARY}: ${items.length} open items`)
