import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import { ImageIcon, PencilIcon } from "lucide-react"
import { type ChangeEvent, type MouseEvent, useRef, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { toast } from "sonner"
import { getCroppedImg } from "./-canvasUtils"

interface MyCropperProps {
  onChange?: (image: string) => void
  existingImagePath?: string
}

export function MyCropper({ onChange, existingImagePath }: MyCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [showExisting, setShowExisting] = useState(!!existingImagePath)
  const [open, setOpen] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const imageDataUrl = await readFile(file)

      setShowExisting(false)
      setCroppedImage(null)
      setOpen(true)
      setImageSrc(imageDataUrl)
    }
  }

  function readFile(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener("load", () => resolve(reader.result as string))
      reader.addEventListener("error", () => reject(reader.error))
      reader.readAsDataURL(file)
    })
  }

  const showCroppedImage = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // The crop area is reported once the cropper has measured the image
    if (!imageSrc || !croppedAreaPixels) return
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
      )
      if (!croppedImage) {
        toast.error("Das Bild konnte nicht zugeschnitten werden.")
        return
      }
      setCroppedImage(croppedImage)
      setOpen(false)
      onChange?.(croppedImage)
    } catch (e) {
      console.error(e)
      toast.error("Das Bild konnte nicht zugeschnitten werden.")
    }
  }

  const handleChangeImage = () => {
    fileInputRef.current?.click()
  }

  // Show cropper dialog when a new image is selected
  if (imageSrc && !croppedImage) {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bild zuschneiden</DialogTitle>
            <DialogDescription>Wähle den Bildausschnitt aus.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex flex-col w-full">
              <div className="relative h-[400px] w-full">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  rotation={rotation}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpen(!open)
                  setImageSrc(null)
                  if (existingImagePath) setShowExisting(true)
                }}
              >
                Abbrechen
              </Button>
            </DialogClose>
            <Button
              onClick={(e) => showCroppedImage(e)}
              disabled={!croppedAreaPixels}
            >
              Nutzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Show cropped image after cropping
  if (croppedImage) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <img
            src={croppedImage}
            alt="Gewähltes Bild"
            className="rounded-2xl max-w-64"
          />
          <button
            type="button"
            onClick={handleChangeImage}
            className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
            title="Bild ändern"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileChange}
          accept="image/*"
          className="hidden"
          aria-label="Bild auswählen"
        />
      </div>
    )
  }

  // Show existing image when editing
  if (showExisting && existingImagePath) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <img
            src={`/img/items/${existingImagePath}`}
            alt="Aktuelles Bild"
            className="rounded-2xl max-w-64"
          />
          <button
            type="button"
            onClick={handleChangeImage}
            className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
            title="Bild ändern"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileChange}
          accept="image/*"
          className="hidden"
          aria-label="Bild auswählen"
        />
      </div>
    )
  }

  // Show empty state
  return (
    <Empty
      className="cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileChange}
        accept="image/*"
        className="hidden"
        aria-label="Bild auswählen"
      />
      <EmptyHeader>
        <EmptyMedia>
          <ImageIcon />
        </EmptyMedia>
        <EmptyTitle>Kein Bild</EmptyTitle>
        <EmptyDescription>Klicken um ein Bild hochzuladen</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
