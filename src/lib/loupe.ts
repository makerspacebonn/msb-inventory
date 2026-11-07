/**
 * Calculations for placing a marker with a loupe: the press as a position
 * on the image, where the loupe goes on screen, and what it shows
 */

import { roundPercent } from "./markerTransform"

export type Point = { x: number; y: number }
export type Box = { left: number; top: number; width: number; height: number }

/** Size of the loupe in px and how much it enlarges */
export const LOUPE_SIZE = 112
export const LOUPE_ZOOM = 3
/** Space between the finger and the loupe, and to the screen edge */
const GAP = 48
const MARGIN = 8

/** A press on the image in percent, to 0.1% like all markers */
export function percentPosition(image: Box, press: Point): Point {
  const clamp = (value: number) =>
    Math.min(100, Math.max(0, roundPercent(value)))
  return {
    x: clamp(((press.x - image.left) / image.width) * 100),
    y: clamp(((press.y - image.top) / image.height) * 100),
  }
}

/**
 * Where the loupe goes on screen (its top left corner): above the finger,
 * so the hand doesn't cover it. Without room above, beside the finger
 * towards the wider side; never below, where the finger moves
 */
export function loupePlacement(
  finger: Point,
  screen: { width: number; height: number },
  size = LOUPE_SIZE,
): Point {
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(value, MARGIN), max - size - MARGIN)

  const above = finger.y - GAP - size
  if (above >= MARGIN) {
    return { x: clamp(finger.x - size / 2, screen.width), y: above }
  }
  const toTheLeft = finger.x > screen.width / 2
  return {
    x: toTheLeft ? finger.x - GAP - size : finger.x + GAP,
    y: clamp(finger.y - size / 2, screen.height),
  }
}

/**
 * The image as the loupe's background, enlarged and moved so the given
 * position lies in the loupe's center
 */
export function loupeBackground(
  image: { width: number; height: number },
  at: Point,
  size = LOUPE_SIZE,
  zoom = LOUPE_ZOOM,
) {
  const x = (at.x / 100) * image.width * zoom
  const y = (at.y / 100) * image.height * zoom
  return {
    backgroundSize: `${image.width * zoom}px ${image.height * zoom}px`,
    backgroundPosition: `${size / 2 - x}px ${size / 2 - y}px`,
  }
}
