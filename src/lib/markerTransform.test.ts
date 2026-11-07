import { describe, expect, it } from "vitest"
import {
  createMarkerTransform,
  type PointPair,
  type Transform,
  transferMarkers,
} from "./markerTransform"

const pairsFor = (
  froms: [number, number][],
  map: (x: number, y: number) => [number, number],
): PointPair[] =>
  froms.map(([x, y]) => {
    const [toX, toY] = map(x, y)
    return { from: { x, y }, to: { x: toX, y: toY } }
  })

const TRIANGLE: [number, number][] = [
  [10, 10],
  [90, 20],
  [40, 80],
]
const CORNERS: [number, number][] = [
  [10, 10],
  [90, 10],
  [90, 90],
  [10, 90],
]

function transformFor(pairs: PointPair[]): Transform {
  const result = createMarkerTransform(pairs)
  if (!result.ok) throw new Error(`Unexpected problem: ${result.problem}`)
  return result.transform
}

function expectPoint(
  actual: { x: number; y: number },
  x: number,
  y: number,
  digits = 6,
) {
  expect(actual.x).toBeCloseTo(x, digits)
  expect(actual.y).toBeCloseTo(y, digits)
}

describe("createMarkerTransform with three points", () => {
  it("keeps positions when the photo is the same", () => {
    const transform = transformFor(pairsFor(TRIANGLE, (x, y) => [x, y]))
    expectPoint(transform({ x: 37, y: 61 }), 37, 61)
  })

  it("follows a shift of the camera", () => {
    const transform = transformFor(pairsFor(TRIANGLE, (x, y) => [x + 5, y - 8]))
    expectPoint(transform({ x: 50, y: 50 }), 55, 42)
  })

  it("follows a camera that is further away", () => {
    const transform = transformFor(
      pairsFor(TRIANGLE, (x, y) => [x / 2 + 25, y / 2 + 25]),
    )
    expectPoint(transform({ x: 100, y: 0 }), 75, 25)
  })

  it("follows a photo turned by 90 degrees", () => {
    const transform = transformFor(pairsFor(TRIANGLE, (x, y) => [100 - y, x]))
    expectPoint(transform({ x: 20, y: 30 }), 70, 20)
  })

  it("handles images with other proportions, as positions are percentages", () => {
    const transform = transformFor(pairsFor(TRIANGLE, (x, y) => [x, y * 0.5]))
    expectPoint(transform({ x: 40, y: 60 }), 40, 30)
  })
})

describe("createMarkerTransform with four or more points", () => {
  // A photo from another angle: straight lines stay straight, but parallel
  // lines don't stay parallel, which three points can't describe
  const perspective = (x: number, y: number): [number, number] => {
    const w = 1 + 0.004 * x + 0.002 * y
    return [(0.9 * x + 0.1 * y + 5) / w, (0.05 * x + 1.1 * y + 3) / w]
  }

  it("follows a photo from another angle", () => {
    const transform = transformFor(pairsFor(CORNERS, perspective))
    const [x, y] = perspective(35, 70)
    expectPoint(transform({ x: 35, y: 70 }), x, y)
  })

  it("uses all points when there are more than four", () => {
    const transform = transformFor(
      pairsFor([...CORNERS, [50, 50], [30, 70]], perspective),
    )
    const [x, y] = perspective(70, 25)
    expectPoint(transform({ x: 70, y: 25 }), x, y, 4)
  })

  it("evens out small tapping errors", () => {
    const froms: [number, number][] = [
      ...CORNERS,
      [50, 50],
      [30, 70],
      [70, 30],
      [50, 15],
    ]
    const errors = [0.4, -0.3, 0.2, -0.4, 0.3, -0.2, 0.4, -0.3]
    const pairs = pairsFor(froms, (x, y) => [x + 10, y + 5]).map((pair, i) => ({
      from: pair.from,
      to: { x: pair.to.x + errors[i], y: pair.to.y - errors[i] },
    }))
    const { x, y } = transformFor(pairs)({ x: 45, y: 55 })

    expect(Math.abs(x - 55)).toBeLessThan(0.5)
    expect(Math.abs(y - 60)).toBeLessThan(0.5)
  })

  it("uses the simple fit when four points can't describe an angle", () => {
    // Three of the four are in a line, which leaves the perspective open.
    // The fourth is far off, so the simple fit doesn't match all of them
    const pairs: PointPair[] = [
      { from: { x: 10, y: 10 }, to: { x: 10, y: 10 } },
      { from: { x: 50, y: 10 }, to: { x: 50, y: 10 } },
      { from: { x: 90, y: 10 }, to: { x: 90, y: 10 } },
      { from: { x: 50, y: 90 }, to: { x: 60, y: 80 } },
    ]
    // Exactly the best simple fit of these points: x + y/8 - 5/4, y * 7/8 + 5/4
    expectPoint(transformFor(pairs)({ x: 20, y: 50 }), 25, 45)
  })

  it("doesn't turn small tapping errors into a perspective", () => {
    const pairs: PointPair[] = [
      { from: { x: 30, y: 30 }, to: { x: 30.8, y: 29.5 } },
      { from: { x: 70, y: 30 }, to: { x: 69.4, y: 30.6 } },
      { from: { x: 70, y: 70 }, to: { x: 70.7, y: 69.4 } },
      { from: { x: 30, y: 70 }, to: { x: 29.5, y: 70.8 } },
    ]
    const transform = transformFor(pairs)
    for (const corner of [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]) {
      const { x, y } = transform(corner)
      expect(Math.hypot(x - corner.x, y - corner.y)).toBeLessThan(5)
    }
  })

  it("rejects a perspective no camera could produce", () => {
    // Far more than the depth a photo can have: one corner would be many
    // times nearer than another
    const extreme = (x: number, y: number): [number, number] => {
      const w = 1 + 0.08 * x
      return [(100 * x) / w, y / w]
    }
    const transform = transformFor(pairsFor(CORNERS, extreme))
    // The simple fit, whose distances grow evenly across the image
    const left = transform({ x: 0, y: 50 })
    const middle = transform({ x: 50, y: 50 })
    const right = transform({ x: 100, y: 50 })
    expect(middle.x - left.x).toBeCloseTo(right.x - middle.x, 6)
  })
})

describe("createMarkerTransform rejects points it can't use", () => {
  it("needs at least three points", () => {
    expect(
      createMarkerTransform(pairsFor(TRIANGLE.slice(0, 2), (x, y) => [x, y])),
    ).toEqual({ ok: false, problem: "too-few" })
  })

  it("rejects points that are almost the same spot", () => {
    expect(
      createMarkerTransform(
        pairsFor(
          [
            [10, 10],
            [11, 10],
            [40, 80],
          ],
          (x, y) => [x, y],
        ),
      ),
    ).toEqual({ ok: false, problem: "too-close" })
  })

  it("rejects points in a line, on either image", () => {
    const line: [number, number][] = [
      [10, 10],
      [50, 50],
      [90, 90],
    ]
    expect(createMarkerTransform(pairsFor(line, (x, y) => [x, y]))).toEqual({
      ok: false,
      problem: "in-a-line",
    })
    expect(
      createMarkerTransform([
        { from: { x: 10, y: 10 }, to: { x: 10, y: 50 } },
        { from: { x: 90, y: 20 }, to: { x: 50, y: 50 } },
        { from: { x: 40, y: 80 }, to: { x: 90, y: 50 } },
      ]),
    ).toEqual({ ok: false, problem: "in-a-line" })
  })

  it("rejects a mirrored result, as points were tapped in the wrong order", () => {
    expect(
      createMarkerTransform(pairsFor(TRIANGLE, (x, y) => [100 - x, y])),
    ).toEqual({ ok: false, problem: "mirrored" })
  })
})

describe("transferMarkers", () => {
  const shift: Transform = ({ x, y }) => ({ x: x + 20, y })

  it("moves markers and rounds to 0.1%, like the marker picker", () => {
    const smallShift: Transform = ({ x, y }) => ({ x: x + 0.44, y: y + 0.06 })
    expect(transferMarkers([{ key: "a", x: 10, y: 10 }], smallShift)).toEqual({
      placed: [{ key: "a", x: 10.4, y: 10.1 }],
      outside: [],
    })
  })

  it("lists markers that end up outside the new image", () => {
    const markers = [
      { key: "inside", x: 50, y: 50 },
      { key: "edge", x: 80, y: 0 },
      { key: "outside", x: 81, y: 50 },
    ]
    const result = transferMarkers(markers, shift)
    expect(result.placed).toEqual([
      { key: "inside", x: 70, y: 50 },
      { key: "edge", x: 100, y: 0 },
    ])
    expect(result.outside).toEqual([{ key: "outside", x: 81, y: 50 }])
  })

  it("treats a position that can't be calculated as outside", () => {
    const broken: Transform = () => ({ x: Number.NaN, y: Infinity })
    expect(transferMarkers([{ key: "a", x: 1, y: 1 }], broken).outside).toEqual(
      [{ key: "a", x: 1, y: 1 }],
    )
  })

  it("never returns a negative zero", () => {
    const tiny: Transform = () => ({ x: -0.02, y: -0.04 })
    const [marker] = transferMarkers([{ key: "a", x: 1, y: 1 }], tiny).placed
    expect(Object.is(marker.x, 0)).toBe(true)
    expect(Object.is(marker.y, 0)).toBe(true)
  })
})
