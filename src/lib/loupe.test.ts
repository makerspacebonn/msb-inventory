import { describe, expect, it } from "vitest"
import {
  LOUPE_SIZE,
  loupeBackground,
  loupePlacement,
  percentPosition,
} from "./loupe"

const screen = { width: 400, height: 800 }

describe("percentPosition", () => {
  const image = { left: 100, top: 50, width: 200, height: 100 }

  it("gives the press in percent of the image, to 0.1%", () => {
    expect(percentPosition(image, { x: 150, y: 75 })).toEqual({ x: 25, y: 25 })
    expect(percentPosition(image, { x: 151, y: 76 })).toEqual({
      x: 25.5,
      y: 26,
    })
    expect(percentPosition(image, { x: 150.33, y: 75.04 })).toEqual({
      x: 25.2,
      y: 25,
    })
  })

  it("stays on the image when the finger moves past its edge", () => {
    expect(percentPosition(image, { x: 0, y: 500 })).toEqual({ x: 0, y: 100 })
  })
})

describe("loupePlacement", () => {
  it("puts the loupe above the finger, centered", () => {
    const at = loupePlacement({ x: 200, y: 400 }, screen)
    expect(at.x).toBe(200 - LOUPE_SIZE / 2)
    expect(at.y + LOUPE_SIZE).toBeLessThan(400)
  })

  it("keeps it on screen near the side edges", () => {
    expect(loupePlacement({ x: 5, y: 400 }, screen).x).toBe(8)
    expect(loupePlacement({ x: 395, y: 400 }, screen).x).toBe(
      400 - LOUPE_SIZE - 8,
    )
  })

  it("goes beside the finger near the top, towards the wider side", () => {
    const left = loupePlacement({ x: 300, y: 20 }, screen)
    expect(left.x + LOUPE_SIZE).toBeLessThan(300)
    const right = loupePlacement({ x: 100, y: 20 }, screen)
    expect(right.x).toBeGreaterThan(100)
    // Never below the finger, and on screen
    for (const at of [left, right]) expect(at.y).toBe(8)
  })
})

describe("loupeBackground", () => {
  it("enlarges the image and centers the position in the loupe", () => {
    expect(
      loupeBackground({ width: 200, height: 100 }, { x: 50, y: 50 }, 100, 3),
    ).toEqual({
      backgroundSize: "600px 300px",
      backgroundPosition: "-250px -100px",
    })
  })

  it("shows the corner of the image in the center for 0%", () => {
    expect(
      loupeBackground({ width: 200, height: 100 }, { x: 0, y: 0 }, 100, 3)
        .backgroundPosition,
    ).toBe("50px 50px")
  })
})
