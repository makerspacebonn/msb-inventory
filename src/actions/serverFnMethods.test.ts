import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Server functions use GET unless told otherwise, and browsers and proxies
// may repeat a GET on their own (OPS-005: several backups from one tap).
// So everything that isn't plainly reading has to use POST
const READS = /^(fetch|get|list|search|check)/

function serverFunctions() {
  const found: { name: string; method: string }[] = []
  for (const file of fs.readdirSync(__dirname)) {
    if (!file.endsWith("Actions.ts")) continue
    const source = fs.readFileSync(path.join(__dirname, file), "utf8")
    for (const match of source.matchAll(
      /export const (\w+) = createServerFn\(([^)]*)\)/g,
    )) {
      found.push({
        name: match[1],
        method: match[2].includes('"POST"') ? "POST" : "GET",
      })
    }
  }
  return found
}

describe("server functions", () => {
  it("finds the server functions", () => {
    expect(serverFunctions().length).toBeGreaterThan(20)
  })

  it("use POST for everything that changes data", () => {
    const changing = serverFunctions().filter((fn) => !READS.test(fn.name))
    expect(changing.filter((fn) => fn.method !== "POST")).toEqual([])
  })
})
