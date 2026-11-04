import { describe, expect, it } from "vitest"
import {
  findTemplate,
  fitLabelText,
  fitLabelTextWithPath,
  fitPathText,
  LABEL_TEMPLATES,
  type LabelTemplate,
  labelRect,
  labelsPerSheet,
  layoutLabel,
  type MeasureText,
  maxFontSizesFor,
  nextFreeLabel,
  placeLabels,
  QR_MAX_SIZE,
  QR_MIN_SIZE,
  qrSizeFor,
  textLineHeight,
} from "./labelSheets"

const herma = LABEL_TEMPLATES[0]

// Every character is 0.5 mm wide per pt of font size divided by 6, i.e.
// 1 mm per character at 12 pt
const measure: MeasureText = (text, fontSize) => (text.length * fontSize) / 12

describe("templates", () => {
  it.each(LABEL_TEMPLATES)("$name fits its labels on the page", (t) => {
    const last = labelRect(t, t.columns * t.rows - 1)
    expect(last.x + last.width).toBeLessThanOrEqual(t.pageWidth)
    expect(last.y + last.height).toBeLessThanOrEqual(t.pageHeight)
    expect(t.marginLeft).toBeGreaterThanOrEqual(0)
    expect(t.marginTop).toBeGreaterThanOrEqual(0)
  })
})

describe("labelRect", () => {
  it("places HERMA 5029's 21 labels centred on A4", () => {
    const herma5029 = findTemplate("herma-5029")
    if (!herma5029) throw new Error("HERMA 5029 template missing")
    expect(labelsPerSheet(herma5029)).toBe(21)
    const last = labelRect(herma5029, 20)
    // Same distance to the right and bottom edge as to the left and top
    expect(210 - (last.x + last.width)).toBeCloseTo(herma5029.marginLeft)
    expect(297 - (last.y + last.height)).toBeCloseTo(herma5029.marginTop)
  })

  it("counts labels row by row", () => {
    expect(labelRect(herma, 0)).toEqual({
      x: 7.25,
      y: 8.7,
      width: 63.5,
      height: 46.6,
    })
    // Second label: same row, next column
    expect(labelRect(herma, 1).x).toBeCloseTo(7.25 + 63.5 + 2.5)
    expect(labelRect(herma, 1).y).toBe(8.7)
    // Fourth label: first column of the second row
    expect(labelRect(herma, 3).x).toBe(7.25)
    expect(labelRect(herma, 3).y).toBeCloseTo(8.7 + 46.6)
  })
})

describe("placeLabels", () => {
  const small: LabelTemplate = { ...herma, columns: 2, rows: 2 }

  it("starts at the first free label and continues on new sheets", () => {
    expect(placeLabels(4, 2, small)).toEqual([
      { sheet: 0, index: 2 },
      { sheet: 0, index: 3 },
      { sheet: 1, index: 0 },
      { sheet: 1, index: 1 },
    ])
  })

  it("keeps the start label within the sheet", () => {
    expect(placeLabels(1, 99, small)).toEqual([{ sheet: 0, index: 3 }])
    expect(placeLabels(1, -3, small)).toEqual([{ sheet: 0, index: 0 }])
  })

  it("suggests the label after the last printed one", () => {
    expect(nextFreeLabel(3, 0, small)).toBe(3)
    expect(nextFreeLabel(4, 2, small)).toBe(2)
    expect(nextFreeLabel(2, 2, small)).toBe(0)
  })
})

describe("qrSizeFor", () => {
  it("takes 45 % of the shorter side, between 20 and 50 mm", () => {
    expect(qrSizeFor(63.5, 46.6)).toBeCloseTo(46.6 * 0.45)
    expect(qrSizeFor(99.1, 67.7)).toBeCloseTo(67.7 * 0.45)
    expect(qrSizeFor(148, 105)).toBeCloseTo(105 * 0.45)
    expect(qrSizeFor(30, 20)).toBe(QR_MIN_SIZE)
    expect(qrSizeFor(297, 210)).toBe(QR_MAX_SIZE)
  })
})

describe("maxFontSizesFor", () => {
  it("keeps 20 pt names on HERMA 4265 and grows them on larger labels", () => {
    expect(maxFontSizesFor(46.6).name).toBeCloseTo(20, 0)
    expect(maxFontSizesFor(67.7).name).toBe(28)
    expect(maxFontSizesFor(20).name).toBe(14)
  })

  it("makes the path half as large as the name, at least 8 pt", () => {
    expect(maxFontSizesFor(67.7).path).toBe(14)
    expect(maxFontSizesFor(20).path).toBe(8)
  })
})

describe("layoutLabel", () => {
  it("puts the name across the full width above the QR code (HERMA 4265)", () => {
    const layout = layoutLabel(63.5, 46.6)
    if (layout.kind !== "stacked") throw new Error(layout.kind)
    expect(layout.qr.size).toBeGreaterThanOrEqual(QR_MIN_SIZE)
    expect(layout.name.width).toBeGreaterThan(55)
    expect(layout.name.y + layout.name.height).toBeLessThan(layout.qr.y)
    expect(layout.qr.y + layout.qr.size).toBeLessThanOrEqual(46.6)
    // The path sits beside the QR code
    expect(layout.path?.x).toBeGreaterThan(layout.qr.x + layout.qr.size)
    expect(layout.path?.height).toBe(layout.qr.size)
  })

  it("puts name and path beside the QR code on low labels", () => {
    const layout = layoutLabel(70, 25)
    if (layout.kind !== "side") throw new Error(layout.kind)
    expect(layout.qr.size).toBe(QR_MIN_SIZE)
    expect(layout.text.x).toBeGreaterThan(layout.qr.x + layout.qr.size)
    expect(layout.text.x + layout.text.width).toBeLessThanOrEqual(70)
  })

  it("only shows the QR code, as large as possible, on tiny labels", () => {
    const layout = layoutLabel(25, 25)
    expect(layout.kind).toBe("qr-only")
    expect(layout.qr.size).toBeGreaterThan(QR_MIN_SIZE)
    expect(layout.qr.x + layout.qr.size).toBeLessThanOrEqual(25)
  })

  it("keeps the QR code within the label on every layout", () => {
    for (const [width, height] of [
      [63.5, 46.6],
      [99.1, 67.7],
      [40, 70],
      [70, 25],
      [18, 18],
      [210, 297],
    ]) {
      const { qr } = layoutLabel(width, height)
      expect(qr.x + qr.size).toBeLessThanOrEqual(width)
      expect(qr.y + qr.size).toBeLessThanOrEqual(height)
      expect(qr.size).toBeLessThanOrEqual(QR_MAX_SIZE)
    }
  })
})

describe("fitLabelText", () => {
  it("uses the largest font size at which the name fits", () => {
    const lines = fitLabelText(
      "Lötkolben",
      null,
      { width: 30, height: 20 },
      measure,
    )
    expect(lines).toEqual([{ text: "Lötkolben", fontSize: 14, bold: true }])
  })

  it("wraps long names and shrinks them until they fit", () => {
    const lines = fitLabelText(
      "Automatische Abisolierzange mit Längenanschlag",
      null,
      { width: 20, height: 12 },
      measure,
    )
    const height = lines.length * textLineHeight(lines[0].fontSize)
    expect(height).toBeLessThanOrEqual(12)
    expect(lines.every((l) => measure(l.text, l.fontSize, true) <= 20)).toBe(
      true,
    )
    expect(lines.map((l) => l.text).join(" ")).toBe(
      "Automatische Abisolierzange mit Längenanschlag",
    )
  })

  it("adds the path in a smaller font below the name", () => {
    const lines = fitLabelText(
      "Regal A",
      "Lager / Regal A",
      { width: 30, height: 20 },
      measure,
    )
    expect(lines[0]).toMatchObject({ text: "Regal A", bold: true })
    expect(lines.at(-1)).toMatchObject({ text: "Lager / Regal A", bold: false })
    expect(lines[lines.length - 1].fontSize).toBeLessThan(lines[0].fontSize)
  })

  it("drops the path rather than the name when space is short", () => {
    const lines = fitLabelText(
      "Box",
      "Werkstatt / Werkbank 1 / Schublade 1",
      { width: 10, height: textLineHeight(14) },
      measure,
    )
    expect(lines).toEqual([{ text: "Box", fontSize: 14, bold: true }])
  })

  it("cuts the name with … when nothing else fits", () => {
    const lines = fitLabelText(
      "Ein sehr langer Name, der nicht passt",
      null,
      { width: 5, height: textLineHeight(6) },
      measure,
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].text.endsWith("…")).toBe(true)
  })
})

describe("fitLabelText word breaks", () => {
  it("shrinks the font before cutting a word apart", () => {
    // "Abisolierzange" is 14 characters: 14 mm at 12 pt, too wide at 14 pt
    const lines = fitLabelText(
      "Abisolierzange",
      null,
      { width: 14, height: 20 },
      measure,
    )
    expect(lines).toEqual([
      { text: "Abisolierzange", fontSize: 12, bold: true },
    ])
  })
})

describe("fitLabelTextWithPath", () => {
  const path = ["MakerSpace", "1. OG", "Büro", "Teileregal 3"]

  it("shows the whole path when it fits", () => {
    const lines = fitLabelTextWithPath(
      "Box 67",
      path,
      { width: 80, height: 20 },
      measure,
    )
    expect(lines.at(-1)?.text).toBe("MakerSpace › 1. OG › Büro › Teileregal 3")
  })

  it("drops the leading names first when the path is too long", () => {
    const lines = fitLabelTextWithPath(
      "Box 67",
      path,
      { width: 20, height: textLineHeight(14) + textLineHeight(9.8) },
      measure,
    )
    const pathLine = lines.filter((line) => !line.bold)
    expect(pathLine).toHaveLength(1)
    expect(pathLine[0].text.startsWith("… › ")).toBe(true)
    expect(pathLine[0].text.endsWith("Teileregal 3")).toBe(true)
  })
})

describe("fitPathText", () => {
  const path = ["MakerSpace", "1. OG", "Büro", "Teileregal 3"]

  it("shows the whole path as large as it fits", () => {
    const lines = fitPathText(path, { width: 40, height: 20 }, measure)
    expect(lines.map((l) => l.text).join(" ")).toBe(
      "MakerSpace › 1. OG › Büro › Teileregal 3",
    )
    expect(lines.every((l) => !l.bold)).toBe(true)
  })

  it("drops leading names instead of cutting words", () => {
    const lines = fitPathText(
      path,
      { width: 18, height: textLineHeight(6) },
      measure,
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].text.startsWith("… › ")).toBe(true)
    expect(lines[0].text.endsWith("Teileregal 3")).toBe(true)
  })

  it("returns nothing for an empty path", () => {
    expect(fitPathText([], { width: 40, height: 20 }, measure)).toEqual([])
  })
})
