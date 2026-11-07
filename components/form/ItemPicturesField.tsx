import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImageIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { type ItemPicture, MAX_ITEM_PICTURES } from "@/src/lib/itemPictures"
import { CropDialog, readImageFile } from "./CropDialog"

const pictureSrc = (picture: ItemPicture) =>
  "path" in picture ? `/img/items/${picture.path}` : picture.upload

/** Moves the picture at `from` to `to`, keeping the others in order */
function move(pictures: ItemPicture[], from: number, to: number) {
  const next = [...pictures]
  const [picture] = next.splice(from, 1)
  next.splice(to, 0, picture)
  return next
}

/**
 * The item's pictures: the selected one large, all of them as thumbnails
 * below, and actions for the selected one. The first is the main picture
 */
export function ItemPicturesField({
  value,
  onChange,
}: {
  value: ItemPicture[]
  onChange: (pictures: ItemPicture[]) => void
}) {
  const [selected, setSelected] = useState(0)
  const [toCrop, setToCrop] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const current = Math.min(selected, value.length - 1)
  const canAdd = value.length < MAX_ITEM_PICTURES

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Choosing the same file again must fire a change as well
    e.target.value = ""
    if (file) setToCrop(await readImageFile(file))
  }

  const change = (pictures: ItemPicture[], select: number) => {
    onChange(pictures)
    setSelected(select)
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      onChange={onFileChange}
      accept="image/*"
      className="hidden"
      aria-label="Bild auswählen"
    />
  )

  const cropDialog = toCrop && (
    <CropDialog
      imageSrc={toCrop}
      onCancel={() => setToCrop(null)}
      onUse={(cropped) => {
        setToCrop(null)
        change([...value, { upload: cropped }], value.length)
      }}
    />
  )

  if (value.length === 0) {
    return (
      <>
        <Empty
          className="cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileInput}
          <EmptyHeader>
            <EmptyMedia>
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>Kein Bild</EmptyTitle>
            <EmptyDescription>Klicken um ein Bild hochzuladen</EmptyDescription>
          </EmptyHeader>
        </Empty>
        {cropDialog}
      </>
    )
  }

  const number = current + 1
  return (
    <div className="flex flex-col items-center gap-3">
      {fileInput}
      <div className="relative">
        <img
          src={pictureSrc(value[current])}
          alt={`Bild ${number} von ${value.length}`}
          className="rounded-2xl w-64 aspect-square object-cover"
        />
        {current === 0 && (
          <Badge className="absolute top-2 left-2">Hauptbild</Badge>
        )}
      </div>

      <fieldset
        aria-label={`Bild ${number}`}
        className="flex flex-wrap justify-center gap-1"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current === 0}
          onClick={() => change(move(value, current, 0), 0)}
        >
          <StarIcon className="w-4 h-4" aria-hidden="true" />
          Als Hauptbild
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Nach vorne"
          disabled={current === 0}
          onClick={() => change(move(value, current, current - 1), current - 1)}
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Nach hinten"
          disabled={current === value.length - 1}
          onClick={() => change(move(value, current, current + 1), current + 1)}
        >
          <ArrowRightIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Entfernen"
          onClick={() =>
            change(
              value.filter((_, i) => i !== current),
              Math.max(0, current - 1),
            )
          }
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </fieldset>

      <ol aria-label="Bilder" className="flex flex-wrap justify-center gap-2">
        {value.map((picture, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: pictures have no id, and the same one may be added twice
          <li key={i}>
            <button
              type="button"
              aria-label={
                i === 0 ? `Bild ${i + 1} (Hauptbild)` : `Bild ${i + 1}`
              }
              aria-pressed={i === current}
              onClick={() => setSelected(i)}
              className={cn(
                "block size-14 overflow-hidden rounded-lg border-2",
                i === current ? "border-primary" : "border-transparent",
              )}
            >
              <img
                src={pictureSrc(picture)}
                alt=""
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
        {canAdd && (
          <li>
            <button
              type="button"
              aria-label="Bild hinzufügen"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-14 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </li>
        )}
      </ol>
      {!canAdd && (
        <p className="text-xs text-muted-foreground">
          Höchstens {MAX_ITEM_PICTURES} Bilder
        </p>
      )}
      {cropDialog}
    </div>
  )
}
