import type { ItemDetailProps } from "@components/ItemDetail"
import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { TrashIcon } from "lucide-react"

export function ItemLocationDeleteButton({
  item,
  onDeleteLocation,
}: ItemDetailProps) {
  return (
    item?.locationChain &&
    item.locationChain.length > 0 && (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <TrashIcon className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ort entfernen?</DialogTitle>
            <DialogDescription>
              Möchtest du den Ort von diesem Item wirklich entfernen? Das Item
              wird danach keinem Ort mehr zugeordnet sein.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive" onClick={onDeleteLocation}>
                Entfernen
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  )
}
