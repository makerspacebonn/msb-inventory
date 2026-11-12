import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { resolveInside } from "./safePath"

// Layout:
//   <tmp>/root/a.jpg
//   <tmp>/root/sub/b.jpg
//   <tmp>/root/escape -> <tmp>/secret.txt   (symlink out of the root)
//   <tmp>/root/inner  -> <tmp>/root/sub      (symlink that stays inside)
//   <tmp>/root-old/c.zip                     (sibling sharing the prefix)
//   <tmp>/secret.txt
// Created at load time: it.each tables are evaluated before beforeAll
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "safepath-")))
let root: string

beforeAll(() => {
  root = path.join(tmp, "root")
  fs.mkdirSync(path.join(root, "sub"), { recursive: true })
  fs.mkdirSync(path.join(tmp, "root-old"))
  fs.writeFileSync(path.join(root, "a.jpg"), "a")
  fs.writeFileSync(path.join(root, "sub", "b.jpg"), "b")
  fs.writeFileSync(path.join(tmp, "root-old", "c.zip"), "c")
  fs.writeFileSync(path.join(tmp, "secret.txt"), "secret")
  fs.symlinkSync(path.join(tmp, "secret.txt"), path.join(root, "escape"))
  fs.symlinkSync(path.join(root, "sub"), path.join(root, "inner"))
})

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe("resolveInside", () => {
  it("returns the real path of files inside the root", () => {
    expect(resolveInside(root, "a.jpg")).toBe(path.join(root, "a.jpg"))
    expect(resolveInside(root, "sub/b.jpg")).toBe(
      path.join(root, "sub", "b.jpg"),
    )
    expect(resolveInside(root, "inner/b.jpg")).toBe(
      path.join(root, "sub", "b.jpg"),
    )
  })

  it("allows .. that stays inside the root", () => {
    expect(resolveInside(root, "sub/../a.jpg")).toBe(path.join(root, "a.jpg"))
  })

  it.each([
    ["parent traversal", "../secret.txt"],
    ["deep traversal", "sub/../../secret.txt"],
    ["sibling with the same prefix", "../root-old/c.zip"],
    ["absolute path", path.join(tmp, "secret.txt")],
    ["symlink pointing outside", "escape"],
    ["missing file", "nope.jpg"],
    ["null byte", "a.jpg\0.png"],
  ])("rejects %s", (_label, rel) => {
    expect(resolveInside(root, rel)).toBeNull()
  })

  it("treats an absolute path as relative to the root, never as itself", () => {
    // path.resolve(root, "/etc/hosts") would return /etc/hosts
    expect(resolveInside(root, "/etc/hosts")).toBeNull()
    expect(resolveInside(root, "/a.jpg")).toBe(path.join(root, "a.jpg"))
  })

  it("refuses to work without a root", () => {
    // SAVE_PATH unset must not turn the working directory into the root
    expect(resolveInside("", "package.json")).toBeNull()
  })
})
