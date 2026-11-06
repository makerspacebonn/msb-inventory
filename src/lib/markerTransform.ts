// Calculates where markers belong on a new photo of a location, from points
// the user tapped on both the old and the new image. Positions are
// percentages of the image, so the images may differ in size and proportions.
//
// This corrects for the camera only: an object that was really moved has to
// be corrected by hand afterwards.

export type Point = { x: number; y: number }
export type PointPair = { from: Point; to: Point }
export type Transform = (point: Point) => Point

export type TransformProblem =
  | "too-few"
  | "too-close"
  | "in-a-line"
  | "mirrored"

export type TransformResult =
  | { ok: true; transform: Transform }
  | { ok: false; problem: TransformProblem }

/** Reference points closer than this (in percent) are the same spot */
const MIN_DISTANCE = 3
/** Below this triangle area (in percent²), three points count as a line */
const MIN_AREA = 150
const SINGULAR = 1e-9
/**
 * Tapping is only so exact. If the simple fit misses the points by no more
 * than this (in percent), they give no evidence for a perspective, and
 * fitting one would only amplify the tapping errors
 */
const TAP_TOLERANCE = 2
/** How much nearer one image corner can be than another in a real photo */
const MAX_DEPTH_RATIO = 3

function triangleArea(a: Point, b: Point, c: Point): number {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2
}

function triples<T>(items: T[]): [T, T, T][] {
  const result: [T, T, T][] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (let k = j + 1; k < items.length; k++) {
        result.push([items[i], items[j], items[k]])
      }
    }
  }
  return result
}

function hasClosePoints(points: Point[]): boolean {
  return points.some((a, i) =>
    points
      .slice(i + 1)
      .some((b) => Math.hypot(a.x - b.x, a.y - b.y) < MIN_DISTANCE),
  )
}

/** Whether the points span an area, instead of lying roughly in a line */
function spansArea(points: Point[]): boolean {
  return triples(points).some(([a, b, c]) => triangleArea(a, b, c) >= MIN_AREA)
}

/** Solves A·x = b by Gaussian elimination; null when there's no clear answer */
function solve(matrix: number[][], values: number[]): number[] | null {
  const rows = matrix.map((row, i) => [...row, values[i]])
  const size = rows.length

  for (let column = 0; column < size; column++) {
    let pivot = column
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) {
        pivot = row
      }
    }
    if (Math.abs(rows[pivot][column]) < SINGULAR) return null
    ;[rows[column], rows[pivot]] = [rows[pivot], rows[column]]

    for (let row = column + 1; row < size; row++) {
      const factor = rows[row][column] / rows[column][column]
      for (let k = column; k <= size; k++) {
        rows[row][k] -= factor * rows[column][k]
      }
    }
  }

  const solution = new Array<number>(size).fill(0)
  for (let row = size - 1; row >= 0; row--) {
    let sum = rows[row][size]
    for (let k = row + 1; k < size; k++) sum -= rows[row][k] * solution[k]
    solution[row] = sum / rows[row][row]
  }
  return solution
}

/** The best fit for more equations than unknowns (normal equations) */
function leastSquares(equations: number[][], values: number[]) {
  const size = equations[0].length
  const matrix = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) =>
      equations.reduce((sum, row) => sum + row[i] * row[j], 0),
    ),
  )
  const right = Array.from({ length: size }, (_, i) =>
    equations.reduce((sum, row, r) => sum + row[i] * values[r], 0),
  )
  return solve(matrix, right)
}

/** Shift, scale, rotation and skew: needs three points */
function fitAffine(pairs: PointPair[]) {
  const equations = pairs.map(({ from }) => [from.x, from.y, 1])
  const forX = leastSquares(
    equations,
    pairs.map(({ to }) => to.x),
  )
  const forY = leastSquares(
    equations,
    pairs.map(({ to }) => to.y),
  )
  if (!forX || !forY) return null

  const [a, b, c] = forX
  const [d, e, f] = forY
  return {
    mirrored: a * e - b * d < 0,
    transform: ({ x, y }: Point): Point => ({
      x: a * x + b * y + c,
      y: d * x + e * y + f,
    }),
  }
}

/** How far the transform misses the points the user tapped, at worst */
function worstMiss(pairs: PointPair[], transform: Transform): number {
  return Math.max(
    ...pairs.map(({ from, to }) => {
      const point = transform(from)
      return Math.hypot(point.x - to.x, point.y - to.y)
    }),
  )
}

/** Moves points around their center, at a size that keeps the numbers steady */
function normalizer(points: Point[]) {
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length
  const meanDistance =
    points.reduce(
      (sum, p) => sum + Math.hypot(p.x - centerX, p.y - centerY),
      0,
    ) / points.length
  const scale = Math.SQRT2 / meanDistance
  return {
    apply: (p: Point): Point => ({
      x: (p.x - centerX) * scale,
      y: (p.y - centerY) * scale,
    }),
    revert: (p: Point): Point => ({
      x: p.x / scale + centerX,
      y: p.y / scale + centerY,
    }),
  }
}

/**
 * Also a photo from another angle: needs four points.
 * Null when the points don't allow for it, or the result isn't a photo any
 * camera could have taken
 */
function fitPerspective(pairs: PointPair[]): Transform | null {
  const source = normalizer(pairs.map((pair) => pair.from))
  const target = normalizer(pairs.map((pair) => pair.to))
  const equations: number[][] = []
  const values: number[] = []
  for (const pair of pairs) {
    const { x, y } = source.apply(pair.from)
    const { x: u, y: v } = target.apply(pair.to)
    equations.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    values.push(u)
    equations.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    values.push(v)
  }
  const fit = leastSquares(equations, values)
  if (!fit) return null

  const [a, b, c, d, e, f, g, h] = fit
  const depth = (p: Point) => g * p.x + h * p.y + 1

  const depths = [0, 100]
    .flatMap((x) => [0, 100].map((y) => ({ x, y })))
    .map((corner) => depth(source.apply(corner)))
  const nearest = Math.min(...depths)
  if (nearest <= SINGULAR || Math.max(...depths) / nearest > MAX_DEPTH_RATIO) {
    return null
  }

  return (point) => {
    const p = source.apply(point)
    const w = depth(p)
    return target.revert({
      x: (a * p.x + b * p.y + c) / w,
      y: (d * p.x + e * p.y + f) / w,
    })
  }
}

/**
 * Builds the calculation from at least three reference points. Four or more
 * also capture a photo taken from another angle, but only when the points
 * clearly need that: the simple fit is far steadier against tapping errors
 */
export function createMarkerTransform(pairs: PointPair[]): TransformResult {
  if (pairs.length < 3) return { ok: false, problem: "too-few" }

  const froms = pairs.map((pair) => pair.from)
  const tos = pairs.map((pair) => pair.to)
  if (hasClosePoints(froms) || hasClosePoints(tos)) {
    return { ok: false, problem: "too-close" }
  }
  if (!spansArea(froms) || !spansArea(tos)) {
    return { ok: false, problem: "in-a-line" }
  }

  const affine = fitAffine(pairs)
  if (!affine) return { ok: false, problem: "in-a-line" }
  if (affine.mirrored) return { ok: false, problem: "mirrored" }

  const affineMiss = worstMiss(pairs, affine.transform)
  if (pairs.length < 4 || affineMiss <= TAP_TOLERANCE) {
    return { ok: true, transform: affine.transform }
  }
  return { ok: true, transform: fitPerspective(pairs) ?? affine.transform }
}

/**
 * Calculates the new positions as whole percentages, like the marker picker
 * sets them. Markers that don't land on the new image stay in `outside` with
 * their old position, for the user to place by hand or remove
 */
export function transferMarkers<T extends Point>(
  markers: T[],
  transform: Transform,
): { placed: T[]; outside: T[] } {
  const placed: T[] = []
  const outside: T[] = []
  for (const marker of markers) {
    const moved = transform(marker)
    // Adding 0 turns a rounded -0 into 0
    const x = Math.round(moved.x) + 0
    const y = Math.round(moved.y) + 0
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      placed.push({ ...marker, x, y })
    } else {
      outside.push(marker)
    }
  }
  return { placed, outside }
}
