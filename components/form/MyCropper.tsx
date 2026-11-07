import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import { ImageIcon, PencilIcon } from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"
import { CropDialog, readImageFile } from "./CropDialog"

interface MyCropperProps {
  onChange?: (image: string) => void
  existingImagePath?: string
}

export function MyCropper({ onChange, existingImagePath }: MyCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [showExisting, setShowExisting] = useState(!!existingImagePath)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const imageDataUrl = await readImageFile(file)
    setShowExisting(false)
    setCroppedImage(null)
    setImageSrc(imageDataUrl)
  }

  const handleChangeImage = () => {
    fileInputRef.current?.click()
  }

  // Show cropper dialog when a new image is selected
  if (imageSrc && !croppedImage) {
    return (
      <CropDialog
        imageSrc={imageSrc}
        onCancel={() => {
          setImageSrc(null)
          if (existingImagePath) setShowExisting(true)
        }}
        onUse={(cropped) => {
          setCroppedImage(cropped)
          onChange?.(cropped)
        }}
      />
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
