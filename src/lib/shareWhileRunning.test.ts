import { describe, expect, it } from "vitest"
import { shareWhileRunning } from "./shareWhileRunning"

describe("shareWhileRunning", () => {
  it("runs once for calls that overlap, and they share the result", async () => {
    let runs = 0
    let finish: (value: string) => void = () => {}
    const once = shareWhileRunning(() => {
      runs++
      return new Promise<string>((resolve) => {
        finish = resolve
      })
    })

    const first = once()
    const second = once()
    finish("backup.zip")

    expect(await first).toBe("backup.zip")
    expect(await second).toBe("backup.zip")
    expect(runs).toBe(1)
  })

  it("runs again after the previous run has finished", async () => {
    let runs = 0
    const once = shareWhileRunning(async () => ++runs)

    expect(await once()).toBe(1)
    expect(await once()).toBe(2)
  })

  it("runs again after a failure, and all waiting calls see the failure", async () => {
    let runs = 0
    const once = shareWhileRunning(async () => {
      runs++
      if (runs === 1) throw new Error("disk full")
      return "ok"
    })

    const first = once()
    const second = once()
    await expect(first).rejects.toThrow("disk full")
    await expect(second).rejects.toThrow("disk full")
    expect(await once()).toBe("ok")
  })
})
