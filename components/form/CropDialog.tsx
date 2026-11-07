import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { toast } from "sonner"
import { getCroppedImg } from "./-canvasUtils"

/** Crops a chosen image to a square; `onUse` gets the result as data URL */
export function CropDialog({
  imageSrc,
  onCancel,
  onUse,
}: {
  imageSrc: string
  onCancel: () => void
  onUse: (croppedImage: string) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const use = async () => {
    // The crop area is reported once the cropper has measured the image
    if (!croppedAreaPixels) return
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      if (!cropped) {
        toast.error("Das Bild konnte nicht zugeschnitten werden.")
        return
      }
      onUse(cropped)
    } catch (e) {
      console.error(e)
      toast.error("Das Bild konnte nicht zugeschnitten werden.")
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bild zuschneiden</DialogTitle>
          <DialogDescription>Wähle den Bildausschnitt aus.</DialogDescription>
        </DialogHeader>
        <div className="relative h-[400px] w-full">
          <Cropper
            image={imageSrc}
            crop={crop}
            rotation={rotation}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onRotationChange={setRotation}
            onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
            onZoomChange={setZoom}
          />
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="button" onClick={use} disabled={!croppedAreaPixels}>
            Nutzen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Reads a chosen file as data URL, for the crop dialog */
export function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(reader.result as string))
    reader.addEventListener("error", () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}
