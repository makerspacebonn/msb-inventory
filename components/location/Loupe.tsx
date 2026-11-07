import {
  LOUPE_SIZE,
  loupeBackground,
  loupePlacement,
  type Point,
} from "@/src/lib/loupe"

/**
 * An enlarged view of the image around `at` (in percent), shown near the
 * finger at `finger` (in screen pixels), with a crosshair in its center
 */
export function Loupe({
  src,
  image,
  at,
  finger,
}: {
  src: string
  /** The image's size on screen */
  image: { width: number; height: number }
  at: Point
  finger: Point
}) {
  const place = loupePlacement(finger, {
    width: window.innerWidth,
    height: window.innerHeight,
  })
  return (
    <div
      data-testid="loupe"
      aria-hidden="true"
      className="pointer-events-none fixed z-50 overflow-hidden rounded-full border-4 border-white bg-no-repeat shadow-xl ring-1 ring-black/30"
      style={{
        left: place.x,
        top: place.y,
        width: LOUPE_SIZE,
        height: LOUPE_SIZE,
        backgroundImage: `url("${src}")`,
        ...loupeBackground(image, at),
      }}
    >
      <FineCross />
    </div>
  )
}

/**
 * A small, thin cross in the center, open in the middle so the exact spot
 * stays visible. Translucent, so it doesn't cover the image; the faint
 * light outline keeps it visible on dark parts
 */
function FineCross() {
  const arm = 7
  const gap = 3
  const center = 12
  const lines = [
    [center, center - gap - arm, center, center - gap],
    [center, center + gap, center, center + gap + arm],
    [center - gap - arm, center, center - gap, center],
    [center + gap, center, center + gap + arm, center],
  ]
  return (
    <svg
      viewBox="0 0 24 24"
      className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2"
    >
      {[
        { stroke: "white", width: 1.75, opacity: 0.35 },
        { stroke: "black", width: 0.75, opacity: 0.5 },
      ].map(({ stroke, width, opacity }) => (
        <g
          key={stroke}
          stroke={stroke}
          strokeWidth={width}
          strokeOpacity={opacity}
          strokeLinecap="round"
        >
          {lines.map(([x1, y1, x2, y2]) => (
            <line key={`${x1},${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      ))}
    </svg>
  )
}
