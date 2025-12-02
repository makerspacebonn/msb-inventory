import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import Cropper from "react-easy-crop"
import { getCroppedImg, getRotatedImage } from "@components/form/-canvasUtils"

export const Route = createFileRoute("/items/testedit")({
  component: RouteComponent,
})

function RouteComponent() {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [croppedImage, setCroppedImage] = useState(null)
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
  const showCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
      )
      console.log("donee", { croppedImage })
      setCroppedImage(croppedImage)
    } catch (e) {
      console.error(e)
    }
  }

  return imageSrc ? (
    <Cropper
      image={imageSrc}
      crop={crop}
      rotation={rotation}
      zoom={zoom}
      aspect={1}
      onCropChange={setCrop}
      onRotationChange={setRotation}
      //onCropComplete={onCropComplete}
      onZoomChange={setZoom}
    />
  ) : (
    <input type="file" onChange={onFileChange} accept="image/*" />
  )
}
