import { QRCodeSVG } from "qrcode.react"

type ItemQRCodeProps = {
  itemId: number
  itemName: string
  baseUrl: string
}

export function ItemQRCode({ itemId, itemName, baseUrl }: ItemQRCodeProps) {
  const url = `${baseUrl}/i/${itemId}`

  return (
    <div className="mt-8 p-4 border rounded-lg flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold">QR-Code</h3>
      <QRCodeSVG value={url} size={200} level="M" />
      <div className="text-center text-sm text-muted-foreground">
        <p className="font-medium">{itemName}</p>
        <p>ID: {itemId}</p>
      </div>
    </div>
  )
}