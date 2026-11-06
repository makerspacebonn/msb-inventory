import { MyCropper } from "@components/form/MyCropper"
import { Button } from "@components/ui/button"
import type { Location } from "@server/app/types"
import { ChevronLeftIcon, Undo2Icon, XIcon } from "lucide-react"
import { type ReactNode, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  buildReview,
  firstOpen,
  placeMarker,
  type ReviewMarker,
  type ReviewSource,
  removeMarker,
  toMarkerUpdates,
} from "@/src/lib/markerReview"
import {
  createMarkerTransform,
  type Point,
  type PointPair,
  type TransformProblem,
} from "@/src/lib/markerTransform"
import type { MarkerUpdate } from "@/src/lib/markerUpdates"

// Four points near the corners are what the calculation works best with
const POINT_HINTS = ["oben links", "oben rechts", "unten rechts", "unten links"]
const RECOMMENDED_POINTS = POINT_HINTS.length

const PROBLEMS: Record<Exclude<TransformProblem, "too-few">, string> = {
  "too-close": "Zwei Punkte liegen fast an derselben Stelle.",
  "in-a-line": "Die Punkte liegen fast auf einer Linie.",
  mirrored:
    "Das ergibt ein gespiegeltes Bild. Wurden die Punkte in derselben Reihenfolge gesetzt?",
}

const percent = (value: number) => `${value}%`

/** A tap's position on the image, as whole percentages like all markers */
function positionOn(
  element: HTMLElement,
  event: { clientX: number; clientY: number },
) {
  const rect = element.getBoundingClientRect()
  const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100),
  }
}

function Overlay({
  at,
  className,
  testId,
  children,
}: {
  at: Point
  className?: string
  testId?: string
  children?: ReactNode
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
        className,
      )}
      style={{ left: percent(at.x), top: percent(at.y) }}
    >
      {children}
    </div>
  )
}

/** An image with things on top; tappable while `onTap` is set */
function ImagePane({
  src,
  label,
  onTap,
  children,
}: {
  src: string
  label: string
  onTap?: (position: Point) => void
  children?: ReactNode
}) {
  return (
    <div className="relative w-full">
      {onTap ? (
        <button
          type="button"
          aria-label={label}
          className="block w-full cursor-crosshair"
          onClick={(e) => onTap(positionOn(e.currentTarget, e))}
        >
          <img src={src} alt="" className="block w-full rounded-lg" />
        </button>
      ) : (
        <img src={src} alt={label} className="block w-full rounded-lg" />
      )}
      {children}
    </div>
  )
}

function NumberedPoint({ at, number }: { at: Point; number: number }) {
  return (
    <Overlay
      at={at}
      className="h-6 w-6 border-2 border-white bg-black/80 text-xs font-bold text-white"
    >
      {number}
    </Overlay>
  )
}

function PhotoStep({
  image,
  onChange,
  onNext,
}: {
  image: string
  onChange: (image: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <MyCropper onChange={onChange} />
      <Button
        className="h-11 w-full sm:h-9 sm:w-auto"
        onClick={onNext}
        disabled={!image}
      >
        Weiter
      </Button>
    </div>
  )
}

function PointsStep({
  oldImage,
  newImage,
  pairs,
  pending,
  onTapOld,
  onTapNew,
  onUndo,
  onNext,
  onByHand,
  onBack,
}: {
  oldImage: string
  newImage: string
  pairs: PointPair[]
  /** The spot tapped on the old image, waiting for its match on the new one */
  pending: Point | null
  onTapOld: (point: Point) => void
  onTapNew: (point: Point) => void
  onUndo: () => void
  onNext: () => void
  onByHand: () => void
  onBack: () => void
}) {
  const result = createMarkerTransform(pairs)
  const problem =
    !result.ok && result.problem !== "too-few" ? PROBLEMS[result.problem] : null
  const hint = POINT_HINTS[pairs.length]
  const number = pairs.length + 1
  const canGoOn = result.ok && !pending

  const instruction = pending
    ? `Tippe auf dieselbe Stelle im neuen Bild (Punkt ${number}).`
    : hint
      ? `Tippe im alten Bild auf eine gut erkennbare Stelle ${hint} (Punkt ${number}).`
      : "Du kannst weitere Punkte setzen oder weitergehen."

  return (
    <div className="space-y-4">
      <p role="status">{instruction}</p>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem} Nimm den letzten Punkt zurück und wähle eine andere Stelle.
        </p>
      )}
      {result.ok && pairs.length < RECOMMENDED_POINTS && !pending && (
        <p className="text-sm text-muted-foreground">
          Mit {RECOMMENDED_POINTS} Punkten wird es genauer, wenn das neue Foto
          aus einem anderen Winkel stammt.
        </p>
      )}

      {/* On phones the image to tap is large and the other one small, so
          both fit on the screen */}
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
        <div className={cn(pending && "w-32 sm:w-full")}>
          <p className="mb-1 text-sm font-medium">Altes Bild</p>
          <ImagePane
            src={oldImage}
            label="Altes Bild"
            onTap={pending ? undefined : onTapOld}
          >
            {pairs.map((pair, i) => (
              <NumberedPoint
                key={`${pair.from.x},${pair.from.y}`}
                at={pair.from}
                number={i + 1}
              />
            ))}
            {pending && <NumberedPoint at={pending} number={number} />}
          </ImagePane>
        </div>
        <div className={cn(!pending && "w-32 sm:w-full")}>
          <p className="mb-1 text-sm font-medium">Neues Bild</p>
          <ImagePane
            src={newImage}
            label="Neues Bild"
            onTap={pending ? onTapNew : undefined}
          >
            {pairs.map((pair, i) => (
              <NumberedPoint
                key={`${pair.to.x},${pair.to.y}`}
                at={pair.to}
                number={i + 1}
              />
            ))}
          </ImagePane>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button className="h-11 sm:h-9" onClick={onNext} disabled={!canGoOn}>
          Weiter
        </Button>
        <Button
          className="h-11 sm:h-9"
          variant="outline"
          onClick={onUndo}
          disabled={pairs.length === 0 && !pending}
        >
          <Undo2Icon className="h-4 w-4" />
          Punkt zurücknehmen
        </Button>
        <Button className="h-11 sm:h-9" variant="ghost" onClick={onBack}>
          <ChevronLeftIcon className="h-4 w-4" />
          Zurück
        </Button>
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">
          Sieht der Ort ganz anders aus? Dann setze die Marker selbst, ausgehend
          von ihren alten Positionen.
        </p>
        <Button className="h-11 sm:h-9" variant="outline" onClick={onByHand}>
          Marker von Hand setzen
        </Button>
      </div>
    </div>
  )
}

function CheckStep({
  oldImage,
  newImage,
  initial,
  saving,
  onSave,
  onBack,
}: {
  oldImage: string
  newImage: string
  initial: ReviewMarker[]
  saving: boolean
  onSave: (updates: MarkerUpdate[]) => void
  onBack: () => void
}) {
  const [markers, setMarkers] = useState(initial)
  const [selectedKey, setSelectedKey] = useState(
    (firstOpen(initial) ?? initial[0])?.key,
  )
  const surface = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const selected = markers.find((marker) => marker.key === selectedKey)
  const open = markers.filter((marker) => !marker.position && !marker.removed)

  const place = (position: Point) => {
    if (!selectedKey) return
    const next = placeMarker(markers, selectedKey, position)
    setMarkers(next)
    // Marker without a place come one after the other
    const nextOpen = firstOpen(next)
    if (nextOpen) setSelectedKey(nextOpen.key)
  }

  return (
    <div className="space-y-4">
      {/* Stays the same for every marker: text changing its length would
          shift the image under a finger that's dragging */}
      <p>
        Wähle einen Marker, tippe dann auf die richtige Stelle im neuen Bild
        oder ziehe ihn dorthin.
      </p>

      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
        {/* The old position as a reference: stays on screen on phones too */}
        <div className="sticky top-16 z-10 flex items-start gap-3 bg-background py-1 sm:static sm:block sm:py-0">
          <div className="w-32 shrink-0 sm:w-full">
            <p className="mb-1 hidden text-sm font-medium sm:block">
              Altes Bild
            </p>
            <ImagePane src={oldImage} label="Altes Bild">
              {markers.map((marker) => (
                <Overlay
                  key={marker.key}
                  at={marker.old}
                  testId={
                    marker.key === selectedKey ? "old-position" : undefined
                  }
                  className={
                    marker.key === selectedKey
                      ? "z-10 h-5 w-5 border-2 border-white bg-amber-500"
                      : "h-2.5 w-2.5 border border-gray-900/60 bg-white/60"
                  }
                />
              ))}
            </ImagePane>
          </div>
          {selected && (
            <p
              role="status"
              className="line-clamp-6 text-sm text-muted-foreground sm:mt-1"
            >
              Alte Position von {selected.label}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Neues Bild</p>
          <div ref={surface} className="relative w-full">
            <ImagePane src={newImage} label="Neues Bild" onTap={place} />
            {markers.map(
              (marker) =>
                marker.position && (
                  <button
                    key={marker.key}
                    type="button"
                    aria-label={marker.label}
                    aria-pressed={marker.key === selectedKey}
                    title={marker.label}
                    className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
                    style={{
                      left: percent(marker.position.x),
                      top: percent(marker.position.y),
                    }}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      dragging.current = true
                      setSelectedKey(marker.key)
                    }}
                    onPointerMove={(e) => {
                      if (dragging.current && surface.current) {
                        setMarkers((current) =>
                          placeMarker(
                            current,
                            marker.key,
                            positionOn(surface.current as HTMLDivElement, e),
                          ),
                        )
                      }
                    }}
                    onPointerUp={() => {
                      dragging.current = false
                    }}
                  >
                    <span
                      className={cn(
                        "block rounded-full border-2 border-white",
                        marker.key === selectedKey
                          ? "h-5 w-5 bg-amber-500"
                          : "h-3.5 w-3.5 bg-sky-600",
                      )}
                    />
                  </button>
                ),
            )}
          </div>
        </div>
      </div>

      {open.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/50 p-3 text-sm"
        >
          <p className="font-medium">
            {open.length === 1
              ? "1 Marker passt nicht auf das neue Bild:"
              : `${open.length} Marker passen nicht auf das neue Bild:`}{" "}
            {open.map((marker) => marker.label).join(", ")}
          </p>
          <p className="text-muted-foreground">
            {open.length === 1
              ? "Setze ihn im neuen Bild von Hand oder entferne ihn."
              : "Setze sie im neuen Bild von Hand oder entferne sie."}
          </p>
        </div>
      )}

      <ul aria-label="Marker" className="divide-y rounded-lg border">
        {markers.map((marker) => (
          <li key={marker.key} className="flex items-center gap-2 p-1">
            <Button
              variant={marker.key === selectedKey ? "secondary" : "ghost"}
              className="h-11 min-w-0 flex-1 justify-start sm:h-9"
              aria-pressed={marker.key === selectedKey}
              onClick={() => setSelectedKey(marker.key)}
            >
              <span className="truncate">{marker.label}</span>
              {marker.removed && (
                <span className="text-xs text-muted-foreground">
                  wird entfernt
                </span>
              )}
              {!marker.removed && !marker.position && (
                <span className="text-xs text-muted-foreground">
                  noch ohne Platz
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
              aria-label={`Marker von ${marker.label} entfernen`}
              disabled={marker.removed}
              onClick={() => setMarkers(removeMarker(markers, marker.key))}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          className="h-11 sm:h-9"
          disabled={open.length > 0 || saving}
          onClick={() => onSave(toMarkerUpdates(markers))}
        >
          {saving ? "Wird gespeichert..." : "Speichern"}
        </Button>
        <Button className="h-11 sm:h-9" variant="ghost" onClick={onBack}>
          <ChevronLeftIcon className="h-4 w-4" />
          Zurück
        </Button>
      </div>
    </div>
  )
}

/**
 * Replaces a location's image, in three steps: the new photo, points that
 * match on both images to calculate where the markers go, and a check of
 * the result with the old position of each marker in view
 */
export function ReplaceImageSteps({
  location,
  markers,
  saving,
  onSave,
  onCancel,
}: {
  location: Location
  markers: ReviewSource[]
  saving: boolean
  onSave: (image: string, updates: MarkerUpdate[]) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<"photo" | "points" | "check">("photo")
  const [newImage, setNewImage] = useState("")
  const [pairs, setPairs] = useState<PointPair[]>([])
  const [pending, setPending] = useState<Point | null>(null)
  const [byHand, setByHand] = useState(false)

  const oldImage = `/img/locations/${location.imagePath}`

  const initialReview = useMemo(() => {
    const result = createMarkerTransform(pairs)
    return buildReview(markers, !byHand && result.ok ? result.transform : null)
  }, [markers, pairs, byHand])

  const stepNumber = { photo: 1, points: 2, check: 3 }[step]
  const stepName = {
    photo: "Neues Foto",
    points: "Gleiche Stellen markieren",
    check: "Marker prüfen",
  }[step]

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Bild ersetzen: {location.name}</h1>
        <p className="text-muted-foreground">
          Schritt {stepNumber} von 3: {stepName}
        </p>
      </div>

      {step === "photo" && (
        <>
          <PhotoStep
            image={newImage}
            onChange={setNewImage}
            onNext={() => setStep("points")}
          />
          <Button variant="ghost" className="h-11 sm:h-9" onClick={onCancel}>
            Abbrechen
          </Button>
        </>
      )}

      {step === "points" && (
        <PointsStep
          oldImage={oldImage}
          newImage={newImage}
          pairs={pairs}
          pending={pending}
          onTapOld={setPending}
          onTapNew={(to) => {
            if (!pending) return
            setPairs([...pairs, { from: pending, to }])
            setPending(null)
          }}
          onUndo={() => {
            if (pending) {
              setPending(null)
            } else {
              setPairs(pairs.slice(0, -1))
            }
          }}
          onNext={() => {
            setByHand(false)
            setStep("check")
          }}
          onByHand={() => {
            setByHand(true)
            setStep("check")
          }}
          onBack={() => setStep("photo")}
        />
      )}

      {step === "check" && (
        <CheckStep
          key={byHand ? "by-hand" : "calculated"}
          oldImage={oldImage}
          newImage={newImage}
          initial={initialReview}
          saving={saving}
          onSave={(updates) => onSave(newImage, updates)}
          onBack={() => setStep("points")}
        />
      )}
    </div>
  )
}
