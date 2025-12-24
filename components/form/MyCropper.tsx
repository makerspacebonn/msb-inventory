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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import { FieldLabel } from "@components/ui/field"
import { ImageIcon } from "lucide-react"
import { useState } from "react"
import Cropper from "react-easy-crop"
import { getCroppedImg, getRotatedImage } from "./-canvasUtils"

interface MyCropperProps {
  onChange?: (image) => void
}

export function MyCropper({ onChange }: MyCropperProps) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [croppedImage, setCroppedImage] = useState(null)
  const [open, setOpen] = useState(true)

  const ORIENTATION_TO_ANGLE = {
    "3": 180,
    "6": 90,
    "8": -90,
  }

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const imageDataUrl = await readFile(file)

      setImageSrc(imageDataUrl)
    }
  }

  function readFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.addEventListener("load", () => resolve(reader.result), false)
      reader.readAsDataURL(file)
    })
  }

  const showCroppedImage = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
      )
      console.log("donee", croppedImage)
      setCroppedImage(croppedImage)
      setOpen(false)
      onChange ? onChange(croppedImage) : null
    } catch (e) {
      console.error(e)
    }
  }

  return imageSrc && !croppedImage ? (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share link</DialogTitle>
          <DialogDescription>
            Anyone who has this link will be able to view this.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 h-[calc(100vh-10rem)]">
          <div className="flex flex-col h-full w-full">
            <div className="relative h-[600px] w-full">
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
              }}
            >
              Schliessen
            </Button>
          </DialogClose>
          <Button onClick={(e) => showCroppedImage(e)}>Nutzen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : croppedImage ? (
    <div>
      <FieldLabel>Bild</FieldLabel>
      <img
        src={croppedImage}
        alt="cropped"
        className="rounded-2xl center max-w-64 mb-4"
      />
    </div>
  ) : (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <ImageIcon />
        </EmptyMedia>{" "}
        <EmptyTitle>Kein Bild </EmptyTitle>
        <EmptyDescription>Es wurden keine Bilder gefunden.</EmptyDescription>
        <EmptyContent>
          <input type="file" onChange={onFileChange} accept="image/*" />
        </EmptyContent>
      </EmptyHeader>
    </Empty>
  )
}
