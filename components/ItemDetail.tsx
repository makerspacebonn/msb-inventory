import { Badge } from "@components/ui/badge"
import { LocationComponent } from "@components/LocationComponent"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import type { Item } from "@server/app/types"
import { Link } from "@tanstack/react-router"
import { ExternalLinkIcon, MapPinIcon, PencilIcon, TrashIcon } from "lucide-react"

type ItemDetailProps = {
  item: Item
  onDeleteLocation?: () => void
}

export const ItemDetail = ({ item, onDeleteLocation }: ItemDetailProps) => {
  const imagePath = `/img/items/${item.imagePath}`
  let marker = item.parentLocationMarker

  return (
    <div className="items-center max-w-128 center mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">{item.name}</h1>
      <div>
        {item.imagePath && (
          <img
            className="rounded-2xl w-128 aspect-square mb-4"
            src={imagePath}
            alt={item.name}
          />
        )}
      </div>
      <div className="mb-4">{item.description}</div>
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {(item.manufacturer ||
        item.model ||
        item.category ||
        item.morestuff ||
        (item.links && item.links.length > 0)) && (
        <div className="mb-4 space-y-2 border rounded-lg p-4 bg-muted/30">
          {item.manufacturer && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground font-medium">
                Hersteller:
              </span>
              <span>{item.manufacturer}</span>
            </div>
          )}
          {item.model && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground font-medium">Modell:</span>
              <span>{item.model}</span>
            </div>
          )}
          {item.category && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground font-medium">
                Kategorie:
              </span>
              <span>{item.category}</span>
            </div>
          )}
          {item.links && item.links.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground font-medium">
                Links:
              </span>
              <div className="flex flex-wrap gap-2">
                {item.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                  >
                    <ExternalLinkIcon className="w-3 h-3" />
                    {link.name || link.type || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}
          {item.morestuff && (
            <div className="text-sm">
              <span className="text-muted-foreground font-medium block mb-1">
                Weitere Infos:
              </span>
              <p className="whitespace-pre-wrap">{item.morestuff}</p>
            </div>
          )}
        </div>
      )}

      <div className="font-bold mb-4">ID: {item.id}</div>
      <h3 className="text-xl font-bold p-2 border-2 rounded-2xl bg-gray-600 flex items-center justify-between">
        <span>Wo finde ich es?</span>
        {item?.locationChain && item.locationChain.length > 0 && (
          <div className="flex items-center gap-1">
            <Link
              to="/items/$itemId/location/add"
              params={{ itemId: item.id.toString() }}
            >
              <Button variant="ghost" size="sm">
                <PencilIcon className="w-4 h-4" />
              </Button>
            </Link>
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
                    Möchtest du den Ort von diesem Item wirklich entfernen? Das
                    Item wird danach keinem Ort mehr zugeordnet sein.
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
          </div>
        )}
      </h3>
      {item?.locationChain && item.locationChain.length > 0 ? (
        <div className="flex flex-col items-center w-full">
          {item.locationChain.map((location) => {
            const currentMarker = marker
            marker = location.parentLocationMarker
            return (
              <div
                key={location.id}
                className="flex flex-col items-center w-full"
              >
                <LocationComponent location={location} marker={currentMarker} />
              </div>
            )
          })}
        </div>
      ) : (
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>Kein Ort hinterlegt</EmptyTitle>
            <EmptyDescription>
              Diesem Item wurde noch kein Ort zugewiesen.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            to="/items/$itemId/location/add"
            params={{ itemId: item.id.toString() }}
          >
            <Button>Ort hinzufügen</Button>
          </Link>
        </Empty>
      )}
    </div>
  )
}
