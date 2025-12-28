import { Button } from "@components/ui/button"
import { Download } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { useCallback, useEffect, useRef, useState } from "react"

type ItemQRCodeProps = {
  itemId: number
  itemName: string
  baseUrl: string
}

export function ItemQRCode({ itemId, itemName, baseUrl }: ItemQRCodeProps) {
  const url = `${baseUrl}/i/${itemId}`
  const qrRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const [pngUrl, setPngUrl] = useState<string | null>(null)

  const generatePng = useCallback(() => {
    const qrCanvas = qrRef.current
    const outputCanvas = outputCanvasRef.current
    if (!qrCanvas || !outputCanvas) return

    const ctx = outputCanvas.getContext("2d")
    if (!ctx) return

    const qrSize = 800
    const padding = 80
    const textPadding = 60
    const nameHeight = 96
    const idHeight = 72
    const totalHeight = qrSize + padding * 2 + textPadding + nameHeight + idHeight
    const totalWidth = qrSize + padding * 2

    outputCanvas.width = totalWidth
    outputCanvas.height = totalHeight

    // White background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, totalWidth, totalHeight)

    // Draw QR code
    ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize)

    // Draw item name
    ctx.fillStyle = "#000000"
    ctx.font = "bold 64px sans-serif"
    ctx.textAlign = "center"
    const nameY = padding + qrSize + textPadding + 64

    // Truncate name if too long
    let displayName = itemName
    const maxWidth = totalWidth - padding * 2
    while (ctx.measureText(displayName).width > maxWidth && displayName.length > 3) {
      displayName = `${displayName.slice(0, -4)}...`
    }
    ctx.fillText(displayName, totalWidth / 2, nameY)

    // Draw ID
    ctx.font = "56px sans-serif"
    ctx.fillStyle = "#666666"
    const idY = nameY + idHeight
    ctx.fillText(`ID: ${itemId}`, totalWidth / 2, idY)

    // Generate PNG URL
    const dataUrl = outputCanvas.toDataURL("image/png")
    setPngUrl(dataUrl)
  }, [itemId, itemName])

  useEffect(() => {
    // Wait for QR code to render
    const timer = setTimeout(generatePng, 100)
    return () => clearTimeout(timer)
  }, [generatePng])

  const handleDownload = () => {
    if (!pngUrl) return
    const link = document.createElement("a")
    link.download = `qr-${itemId}-${itemName.replace(/[^a-zA-Z0-9]/g, "-")}.png`
    link.href = pngUrl
    link.click()
  }

  return (
    <div className="mt-8 p-4 border rounded-lg flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold">QR-Code</h3>

      {/* Hidden QR canvas for source */}
      <div className="hidden">
        <QRCodeCanvas ref={qrRef} value={url} size={800} level="M" />
      </div>

      {/* Hidden output canvas */}
      <canvas ref={outputCanvasRef} className="hidden" />

      {/* Display the generated PNG */}
      {pngUrl && (
        <img
          src={pngUrl}
          alt={`QR code for ${itemName}`}
          className="rounded border max-w-[160px]"
        />
      )}

      <Button variant="outline" size="sm" onClick={handleDownload} disabled={!pngUrl}>
        <Download className="w-4 h-4 mr-2" />
        PNG herunterladen
      </Button>
    </div>
  )
}
