// Label sheets: templates, label positions and the layout of one label.
// All sizes are in millimetres.

export type LabelTemplate = {
  id: string
  name: string
  pageWidth: number
  pageHeight: number
  columns: number
  rows: number
  labelWidth: number
  labelHeight: number
  /** Distance from the top/left page edge to the first label */
  marginTop: number
  marginLeft: number
  /** Space between neighbouring labels */
  gapX: number
  gapY: number
}

/**
 * Available sheet types. To add one, copy its measurements from the
 * manufacturer's data sheet and check the result with a test print
 * ("Rahmen drucken" on the label page).
 */
export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    // 18 labels per A4 sheet. The labels are centred on the sheet with
    // 2.5 mm between the columns, as on comparable 63.5 × 46.6 mm sheets
    id: "herma-4265",
    name: "HERMA 4265 (63,5 × 46,6 mm, 18 pro Blatt)",
    pageWidth: 210,
    pageHeight: 297,
    columns: 3,
    rows: 6,
    labelWidth: 63.5,
    labelHeight: 46.6,
    marginTop: 8.7,
    marginLeft: 7.25,
    gapX: 2.5,
    gapY: 0,
  },
  {
    // 21 labels per A4 sheet, centred: 3 × 63.5 + 2 × 2.5 = 195.5 mm wide,
    // 7 × 38.1 = 266.7 mm high, the same grid as Avery L7160
    id: "herma-5029",
    name: "HERMA 5029 (63,5 × 38,1 mm, 21 pro Blatt)",
    pageWidth: 210,
    pageHeight: 297,
    columns: 3,
    rows: 7,
    labelWidth: 63.5,
    labelHeight: 38.1,
    marginTop: 15.15,
    marginLeft: 7.25,
    gapX: 2.5,
    gapY: 0,
  },
  {
    // 12 labels per A4 sheet: 2 × 105 mm span the full width, 6 × 48 mm
    // leave 4.5 mm at the top and bottom
    id: "niceday-980467",
    name: "Niceday 980467 (105 × 48 mm, 12 pro Blatt)",
    pageWidth: 210,
    pageHeight: 297,
    columns: 2,
    rows: 6,
    labelWidth: 105,
    labelHeight: 48,
    marginTop: 4.5,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },
]

export function findTemplate(id: string): LabelTemplate | undefined {
  return LABEL_TEMPLATES.find((template) => template.id === id)
}

export const labelsPerSheet = (template: LabelTemplate) =>
  template.columns * template.rows

export type Rect = { x: number; y: number; width: number; height: number }

/** Position of a label on its sheet; labels are counted row by row */
export function labelRect(template: LabelTemplate, index: number): Rect {
  const column = index % template.columns
  const row = Math.floor(index / template.columns)
  return {
    x: template.marginLeft + column * (template.labelWidth + template.gapX),
    y: template.marginTop + row * (template.labelHeight + template.gapY),
    width: template.labelWidth,
    height: template.labelHeight,
  }
}

export type LabelSlot = { sheet: number; index: number }

/**
 * Places `count` labels onto sheets, starting at label `startIndex` of the
 * first sheet (the labels before it are already used). Further sheets are
 * filled from their first label.
 */
export function placeLabels(
  count: number,
  startIndex: number,
  template: LabelTemplate,
): LabelSlot[] {
  const perSheet = labelsPerSheet(template)
  const start = Math.min(Math.max(0, startIndex), perSheet - 1)
  return Array.from({ length: count }, (_, i) => {
    const position = start + i
    return {
      sheet: Math.floor(position / perSheet),
      index: position % perSheet,
    }
  })
}

/** The first free label after printing `count` labels from `startIndex` */
export function nextFreeLabel(
  count: number,
  startIndex: number,
  template: LabelTemplate,
): number {
  return (startIndex + count) % labelsPerSheet(template)
}

/** Text narrower or lower than this isn't readable on a label */
const MIN_TEXT_WIDTH = 12
const MIN_TEXT_HEIGHT = 4

// QR code size: 45 % of the label's shorter side, at least 20 mm so phones
// scan it reliably (about 0.65 mm per module). The maximum only applies to
// sign-sized labels (shorter side over 111 mm): 50 mm still scans from about
// half a metre, and the rest of the label stays free for the name
export const QR_MIN_SIZE = 20
export const QR_MAX_SIZE = 50
const QR_SHARE = 0.45

/**
 * Largest font sizes (pt) for name and path: they grow with the label so
 * signs are readable from further away (20 pt on a 46.6 mm high label)
 */
export function maxFontSizesFor(height: number): {
  name: number
  path: number
} {
  const name = Math.min(28, Math.max(14, height * 0.43))
  return { name, path: Math.max(8, name / 2) }
}

export function qrSizeFor(width: number, height: number): number {
  const proportional = Math.min(width, height) * QR_SHARE
  return Math.min(QR_MAX_SIZE, Math.max(QR_MIN_SIZE, proportional))
}

type QrBox = { x: number; y: number; size: number }

/** Where the QR code and texts go, relative to the label's top left corner */
export type LabelLayout =
  /** Name across the full width on top; QR code below, path beside it */
  | { kind: "stacked"; qr: QrBox; name: Rect; path: Rect | null }
  /** Low labels: QR code on the left, name and path on the right */
  | { kind: "side"; qr: QrBox; text: Rect }
  /** Too small for readable text */
  | { kind: "qr-only"; qr: QrBox }

/**
 * Splits a label into the QR code and the text areas. The QR code gets
 * its size first (see qrSizeFor); the name then gets the full width above
 * it if there's room for at least one line, otherwise the space beside it.
 */
export function layoutLabel(width: number, height: number): LabelLayout {
  const padding = Math.max(1, Math.min(width, height) * 0.05)
  const gap = padding
  const innerWidth = width - 2 * padding
  const innerHeight = height - 2 * padding
  const size = Math.min(qrSizeFor(width, height), innerWidth, innerHeight)

  const nameHeight = innerHeight - size - gap
  if (nameHeight >= MIN_TEXT_HEIGHT && innerWidth >= MIN_TEXT_WIDTH) {
    const qrY = padding + nameHeight + gap
    const pathX = padding + size + gap
    const pathWidth = width - padding - pathX
    return {
      kind: "stacked",
      qr: { x: padding, y: qrY, size },
      name: { x: padding, y: padding, width: innerWidth, height: nameHeight },
      path:
        pathWidth >= MIN_TEXT_WIDTH
          ? { x: pathX, y: qrY, width: pathWidth, height: size }
          : null,
    }
  }

  const textX = padding + size + gap
  const textWidth = width - padding - textX
  if (textWidth >= MIN_TEXT_WIDTH && innerHeight >= MIN_TEXT_HEIGHT) {
    return {
      kind: "side",
      qr: { x: padding, y: (height - size) / 2, size },
      text: { x: textX, y: padding, width: textWidth, height: innerHeight },
    }
  }

  // No room for text: the QR code as large as the label allows, centred
  const qrOnly = Math.min(innerWidth, innerHeight)
  return {
    kind: "qr-only",
    qr: { x: (width - qrOnly) / 2, y: (height - qrOnly) / 2, size: qrOnly },
  }
}

export type TextLine = { text: string; fontSize: number; bold: boolean }

/** Measures a text's width in mm at a font size in pt */
export type MeasureText = (
  text: string,
  fontSize: number,
  bold: boolean,
) => number

const PT_TO_MM = 0.3528
const LINE_HEIGHT = 1.2

const lineHeight = (fontSize: number) => fontSize * PT_TO_MM * LINE_HEIGHT

/**
 * Breaks text into lines of at most `width`. A word wider than a line is
 * cut, which `cut` reports, so callers can try a smaller font first.
 */
function wrap(
  text: string,
  width: number,
  fontSize: number,
  bold: boolean,
  measure: MeasureText,
): { lines: string[]; cut: boolean } {
  const lines: string[] = []
  let cut = false
  let line = ""
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate, fontSize, bold) <= width) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    // A single word wider than the line is cut into pieces
    let rest = word
    while (measure(rest, fontSize, bold) > width && rest.length > 1) {
      cut = true
      let end = rest.length - 1
      while (end > 1 && measure(rest.slice(0, end), fontSize, bold) > width) {
        end--
      }
      lines.push(rest.slice(0, end))
      rest = rest.slice(end)
    }
    line = rest
  }
  if (line) lines.push(line)
  return { lines, cut }
}

/** Shortens the last line with "…" until it fits */
function ellipsize(
  line: string,
  width: number,
  fontSize: number,
  bold: boolean,
  measure: MeasureText,
): string {
  let text = line
  while (text.length > 1 && measure(`${text}…`, fontSize, bold) > width) {
    text = text.slice(0, -1)
  }
  return `${text.trimEnd()}…`
}

/**
 * Fits the name (bold, as large as possible) and then the path (smaller,
 * only if there's room left) into the text area. The name wins: the path
 * is dropped before the name gets smaller than it has to. Lines break
 * between words; a word is only cut when even the smallest size is too
 * wide for it.
 */
export function fitLabelText(
  name: string,
  path: string | null,
  area: { width: number; height: number },
  measure: MeasureText,
  { maxFontSize = 14, minFontSize = 6 } = {},
): TextLine[] {
  for (let size = maxFontSize; size >= minFontSize; size -= 0.5) {
    const { lines: nameLines, cut } = wrap(
      name,
      area.width,
      size,
      true,
      measure,
    )
    const nameHeight = nameLines.length * lineHeight(size)
    if (nameHeight > area.height || cut) continue

    const lines: TextLine[] = nameLines.map((text) => ({
      text,
      fontSize: size,
      bold: true,
    }))

    if (path) {
      const pathSize = Math.max(minFontSize, size * 0.7)
      const { lines: pathLines, cut: pathCut } = wrap(
        path,
        area.width,
        pathSize,
        false,
        measure,
      )
      const room = Math.floor((area.height - nameHeight) / lineHeight(pathSize))
      // A path that only fits with words cut apart is left out
      if (room > 0 && !pathCut) {
        const shown = pathLines.slice(0, room)
        if (pathLines.length > room) {
          shown[room - 1] = ellipsize(
            shown[room - 1],
            area.width,
            pathSize,
            false,
            measure,
          )
        }
        lines.push(
          ...shown.map((text) => ({ text, fontSize: pathSize, bold: false })),
        )
      }
    }
    return lines
  }

  // Not even the smallest size fits: as many name lines as possible
  const room = Math.max(1, Math.floor(area.height / lineHeight(minFontSize)))
  const { lines: nameLines } = wrap(
    name,
    area.width,
    minFontSize,
    true,
    measure,
  )
  const shown = nameLines.slice(0, room)
  if (nameLines.length > room) {
    shown[room - 1] = ellipsize(
      shown[room - 1],
      area.width,
      minFontSize,
      true,
      measure,
    )
  }
  return shown.map((text) => ({ text, fontSize: minFontSize, bold: true }))
}

/** Height of a line in mm, for placing the lines one below the other */
export const textLineHeight = lineHeight

/** Separator between location names in a path on labels */
export const PATH_SEPARATOR = " › "

/**
 * Like fitLabelText, but for a location path given as names from the root
 * down: when the whole path doesn't fit, leading names are dropped first
 * ("… › Büro › Regal 3"), since the nearest parents say the most.
 */
export function fitLabelTextWithPath(
  name: string,
  path: string[],
  area: { width: number; height: number },
  measure: MeasureText,
  options?: { maxFontSize?: number; minFontSize?: number },
): TextLine[] {
  let best: TextLine[] = fitLabelText(name, null, area, measure, options)
  for (let drop = 0; drop < path.length; drop++) {
    const shown = path.slice(drop)
    const text = (drop > 0 ? ["…", ...shown] : shown).join(PATH_SEPARATOR)
    const lines = fitLabelText(name, text, area, measure, options)
    const pathLines = lines.filter((line) => !line.bold)
    // Keep the first variant whose path is shown in full
    if (pathLines.length > 0 && !pathLines.at(-1)?.text.endsWith("…")) {
      return lines
    }
    if (pathLines.length > 0) best = lines
  }
  return best
}

/**
 * Fits a location path (names from the root down) into its own area, as
 * large as possible up to `maxFontSize`. Leading names are dropped first
 * when the whole path doesn't fit; words are never cut apart.
 */
export function fitPathText(
  path: string[],
  area: { width: number; height: number },
  measure: MeasureText,
  { maxFontSize = 10, minFontSize = 6 } = {},
): TextLine[] {
  if (path.length === 0) return []
  for (let size = maxFontSize; size >= minFontSize; size -= 0.5) {
    for (let drop = 0; drop < path.length; drop++) {
      const shown = path.slice(drop)
      const text = (drop > 0 ? ["…", ...shown] : shown).join(PATH_SEPARATOR)
      const { lines, cut } = wrap(text, area.width, size, false, measure)
      if (!cut && lines.length * lineHeight(size) <= area.height) {
        return lines.map((line) => ({
          text: line,
          fontSize: size,
          bold: false,
        }))
      }
    }
  }
  return []
}
