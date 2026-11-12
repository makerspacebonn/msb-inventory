import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import sharp from "sharp"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// The router hands the handler an already-decoded splat: "/img/..%2fx"
// arrives as "../x". These are the shapes an attacker can produce.
// Created at load time: it.each tables are evaluated before beforeAll
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "imgroute-")))
let root: string
type Handler = (ctx: {
  params: { _splat?: string }
  request: Request
}) => Promise<Response>
let GET: Handler

beforeAll(async () => {
  root = path.join(tmp, "img")
  fs.mkdirSync(root)
  fs.mkdirSync(path.join(tmp, "img-old"))
  fs.writeFileSync(path.join(tmp, "secret.txt"), "secret")
  fs.writeFileSync(path.join(tmp, "img-old", "x.jpg"), "x")
  fs.symlinkSync(path.join(tmp, "secret.txt"), path.join(root, "escape.jpg"))
  vi.stubEnv("SAVE_PATH", root)
  const mod = await import("./img.$")
  // biome-ignore lint/suspicious/noExplicitAny: reaching into the route's server handlers
  GET = (mod.Route.options as any).server.handlers.GET
})

afterAll(() => {
  vi.unstubAllEnvs()
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe("GET /img/$ path containment", () => {
  it.each([
    ["../", "../secret.txt"],
    ["decoded %2e%2e/", "../../secret.txt"],
    ["decoded ..%2f", "..//secret.txt"],
    ["encoded backslash", "..\\secret.txt"],
    ["sibling dir with same prefix", "../img-old/x.jpg"],
    ["absolute path", path.join(tmp, "secret.txt")],
    ["symlink out of the root", "escape.jpg"],
    ["the root itself", "."],
  ])("returns 404 for %s", async (_label, splat) => {
    const res = await GET({
      params: { _splat: splat },
      request: new Request(`http://localhost/img/${encodeURIComponent(splat)}`),
    })
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain("secret")
  })

  it("caches under the resolved path when .. climbs out and back in", async () => {
    // Resolves to <root>/a.jpg; joined raw onto <root>/.cache/default/ it
    // would create a stray <root>/<tmp>/img/a.jpg instead
    await sharp({
      create: { width: 4, height: 4, channels: 3, background: "red" },
    })
      .jpeg()
      .toFile(path.join(root, "a.jpg"))
    const splat = `../../${path.basename(tmp)}/img/a.jpg`
    const res = await GET({
      params: { _splat: splat },
      request: new Request("http://localhost/img/x"),
    })
    expect(res.status).toBe(200)
    expect(fs.existsSync(path.join(root, ".cache", "default", "a.jpg"))).toBe(
      true,
    )
    expect(fs.readdirSync(tmp).sort()).toEqual(["img", "img-old", "secret.txt"])
  })
})
