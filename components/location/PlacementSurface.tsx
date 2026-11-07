import { type ReactNode, useEffect, useRef, useState } from "react"
import { type Point, percentPosition } from "@/src/lib/loupe"
import { Loupe } from "./Loupe"

// A finger held this long without moving starts the loupe; moving earlier
// scrolls the page as usual
const HOLD_MS = 150
const MOVE_TOLERANCE_PX = 8

type Press = {
  pointerId: number
  start: Point
  finger: Point
  at: Point
  active: boolean
}

/**
 * An image to place something on. A quick tap or click places it right
 * away; holding (and with the mouse, any press) shows a loupe with the
 * spot enlarged, moving refines it and letting go places it
 */
export function PlacementSurface({
  src,
  label,
  onPlace,
  children,
}: {
  src: string
  label: string
  onPlace: (position: Point) => void
  children?: ReactNode
}) {
  const button = useRef<HTMLButtonElement>(null)
  const [press, setPress] = useState<Press | null>(null)
  const pressRef = useRef<Press | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const update = (next: Press | null) => {
    pressRef.current = next
    setPress(next)
  }

  const positionOf = (client: Point) => {
    const rect = button.current?.getBoundingClientRect()
    return rect ? percentPosition(rect, client) : { x: 0, y: 0 }
  }

  // While the loupe is shown, the finger moves it instead of the page.
  // React's touch listeners are passive, so this one is added by hand
  useEffect(() => {
    const element = button.current
    if (!element) return
    const stopScrolling = (e: TouchEvent) => {
      if (pressRef.current?.active) e.preventDefault()
    }
    element.addEventListener("touchmove", stopScrolling, { passive: false })
    return () => element.removeEventListener("touchmove", stopScrolling)
  }, [])

  useEffect(() => () => clearTimeout(holdTimer.current), [])

  const end = () => {
    clearTimeout(holdTimer.current)
    update(null)
  }

  const rect = button.current?.getBoundingClientRect()
  return (
    <div className="relative w-full">
      <button
        ref={button}
        type="button"
        aria-label={label}
        className="block w-full cursor-crosshair select-none [-webkit-touch-callout:none]"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const client = { x: e.clientX, y: e.clientY }
          const isMouse = e.pointerType === "mouse"
          e.currentTarget.setPointerCapture(e.pointerId)
          update({
            pointerId: e.pointerId,
            start: client,
            finger: client,
            at: positionOf(client),
            active: isMouse,
          })
          if (!isMouse) {
            holdTimer.current = setTimeout(() => {
              const current = pressRef.current
              if (current) update({ ...current, active: true })
            }, HOLD_MS)
          }
        }}
        onPointerMove={(e) => {
          const current = pressRef.current
          if (!current || current.pointerId !== e.pointerId) return
          const client = { x: e.clientX, y: e.clientY }
          if (!current.active) {
            // Moving before the loupe shows is scrolling, not placing
            const moved = Math.hypot(
              client.x - current.start.x,
              client.y - current.start.y,
            )
            if (moved > MOVE_TOLERANCE_PX) end()
            return
          }
          update({ ...current, finger: client, at: positionOf(client) })
        }}
        onPointerUp={(e) => {
          const current = pressRef.current
          if (!current || current.pointerId !== e.pointerId) return
          end()
          onPlace(current.at)
        }}
        onPointerCancel={end}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none block w-full rounded-lg"
        />
      </button>
      {children}
      {press?.active && rect && (
        <Loupe src={src} image={rect} at={press.at} finger={press.finger} />
      )}
    </div>
  )
}
