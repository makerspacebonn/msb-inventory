import { Button } from "@components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@components/ui/empty"
import { Link } from "@tanstack/react-router"
import { MapPinIcon } from "lucide-react"

export function LocationEmpty(props: { itemId: number; canAdd: boolean }) {
  return (
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
      {props.canAdd && (
        <Button asChild>
          <Link
            to="/items/$itemId/location/add"
            params={{ itemId: props.itemId.toString() }}
          >
            Ort hinzufügen
          </Link>
        </Button>
      )}
    </Empty>
  )
}
