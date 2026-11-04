import {
  fitLabelText,
  fitLabelTextWithPath,
  fitPathText,
  type LabelTemplate,
  labelRect,
  labelsPerSheet,
  layoutLabel,
  type MeasureText,
  maxFontSizesFor,
  placeLabels,
  type Rect,
  type TextLine,
  textLineHeight,
} from "./labelSheets"

export type SheetLabel = {
  /** Link the QR code opens */
  url: string
  name: string
  /** Parent location names for location labels, otherwise null */
  path: string[] | null
}

export type LabelPdfOptions = {
  template: LabelTemplate
  labels: SheetLabel[]
  /** First free label on the first sheet */
  startIndex: number
  /** Shifts everything, to correct a printer's offset (mm) */
  offset?: { x: number; y: number }
  /** Draws the outline of every label, for checking the alignment */
  outlines?: boolean
  /**
   * Numbers the outlined labels and marks label 1 with "oben", so a test
   * print shows which way round the sheet goes into the printer
   */
  numbered?: boolean
}

// Empty modules around the QR code; scanners need some quiet zone, and
// the label's own margin adds to it
const QUIET_ZONE_MODULES = 1

/**
 * Creates a PDF with the labels placed on the sheet positions. The PDF
 * libraries are loaded on demand, as only the label page needs them.
 */
export async function createLabelSheetPdf({
  template,
  labels,
  startIndex,
  offset = { x: 0, y: 0 },
  outlines = false,
  numbered = false,
}: LabelPdfOptions): Promise<Blob> {
  const [{ jsPDF }, QRCode] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ])

  const doc = new jsPDF({
    unit: "mm",
    format: [template.pageWidth, template.pageHeight],
    orientation:
      template.pageWidth > template.pageHeight ? "landscape" : "portrait",
  })

  const measure: MeasureText = (text, fontSize, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(fontSize)
    return doc.getTextWidth(text)
  }

  const slots = placeLabels(labels.length, startIndex, template)
  const sheetCount = Math.max(1, (slots.at(-1)?.sheet ?? 0) + 1)

  for (let sheet = 0; sheet < sheetCount; sheet++) {
    if (sheet > 0) doc.addPage()

    if (outlines) {
      doc.setDrawColor(170)
      doc.setLineWidth(0.2)
      for (let index = 0; index < labelsPerSheet(template); index++) {
        const rect = labelRect(template, index)
        doc.rect(rect.x + offset.x, rect.y + offset.y, rect.width, rect.height)
        if (numbered) drawLabelNumber(doc, rect, offset, index)
      }
    }

    labels.forEach((label, i) => {
      if (slots[i].sheet !== sheet) return
      const rect = labelRect(template, slots[i].index)
      const x = rect.x + offset.x
      const y = rect.y + offset.y
      const layout = layoutLabel(rect.width, rect.height)

      // QR code as vector rectangles, so it stays sharp at any size
      const qr = QRCode.create(label.url, { errorCorrectionLevel: "M" })
      const count = qr.modules.size
      const module = layout.qr.size / (count + 2 * QUIET_ZONE_MODULES)
      const qrX = x + layout.qr.x + QUIET_ZONE_MODULES * module
      const qrY = y + layout.qr.y + QUIET_ZONE_MODULES * module
      doc.setFillColor(0, 0, 0)
      for (let row = 0; row < count; row++) {
        let col = 0
        while (col < count) {
          if (!qr.modules.get(row, col)) {
            col++
            continue
          }
          // Merge a run of dark modules into one rectangle
          const runStart = col
          while (col < count && qr.modules.get(row, col)) col++
          doc.rect(
            qrX + runStart * module,
            qrY + row * module,
            (col - runStart) * module,
            module,
            "F",
          )
        }
      }

      // Draws lines into an area, from its top or vertically centred
      const drawLines = (
        lines: TextLine[],
        area: Rect,
        align: "top" | "middle",
      ) => {
        const blockHeight = lines.reduce(
          (sum, line) => sum + textLineHeight(line.fontSize),
          0,
        )
        let lineY =
          y +
          area.y +
          (align === "middle"
            ? Math.max(0, (area.height - blockHeight) / 2)
            : 0)
        doc.setTextColor(0, 0, 0)
        for (const line of lines) {
          doc.setFont("helvetica", line.bold ? "bold" : "normal")
          doc.setFontSize(line.fontSize)
          doc.text(line.text, x + area.x, lineY, { baseline: "top" })
          lineY += textLineHeight(line.fontSize)
        }
      }

      if (layout.kind === "stacked") {
        // The name gets the full width and grows on large labels
        const maxSizes = maxFontSizesFor(rect.height)
        drawLines(
          fitLabelText(label.name, null, layout.name, measure, {
            maxFontSize: maxSizes.name,
          }),
          layout.name,
          "top",
        )
        if (label.path && layout.path) {
          drawLines(
            fitPathText(label.path, layout.path, measure, {
              maxFontSize: maxSizes.path,
            }),
            layout.path,
            "middle",
          )
        }
      } else if (layout.kind === "side") {
        const lines = label.path
          ? fitLabelTextWithPath(label.name, label.path, layout.text, measure)
          : fitLabelText(label.name, null, layout.text, measure)
        drawLines(lines, layout.text, "middle")
      }
    })
  }

  return doc.output("blob")
}

type PdfDoc = InstanceType<typeof import("jspdf")["jsPDF"]>

/**
 * Writes the label's number into its outline. Label 1 gets a large number,
 * an arrow and "OBEN", so the printed test page shows the top edge.
 */
function drawLabelNumber(
  doc: PdfDoc,
  rect: Rect,
  offset: { x: number; y: number },
  index: number,
) {
  const x = rect.x + offset.x
  const y = rect.y + offset.y
  const centerX = x + rect.width / 2

  if (index > 0) {
    doc.setTextColor(150)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(String(index + 1), centerX, y + rect.height / 2, {
      align: "center",
      baseline: "middle",
    })
    return
  }

  // Label 1: arrow pointing to the top edge, "OBEN" and a large "1".
  // The arrow is drawn, as the PDF standard fonts have no arrow character
  const unit = Math.min(rect.width, rect.height) / 10
  doc.setFillColor(0, 0, 0)
  doc.triangle(
    centerX,
    y + unit,
    centerX - unit,
    y + 2.2 * unit,
    centerX + unit,
    y + 2.2 * unit,
    "F",
  )
  doc.rect(centerX - unit / 3, y + 2.2 * unit, (2 * unit) / 3, unit, "F")
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("OBEN", centerX, y + 3.6 * unit, {
    align: "center",
    baseline: "top",
  })
  doc.setFontSize(28)
  doc.text("1", centerX, y + rect.height - unit, {
    align: "center",
    baseline: "bottom",
  })
}
