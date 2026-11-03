import { Button } from "@components/ui/button"
import { Link } from "@tanstack/react-router"
import { CheckIcon, ListTreeIcon, PackageIcon, TagIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  fetchItemsInLocation,
  fetchLocationSubtree,
} from "@/src/actions/labelActions"
import { useAuth } from "@/src/context/AuthContext"
import {
  type LabelEntryKind,
  useLabelSheet,
} from "@/src/context/LabelSheetContext"

// These controls only appear while a label sheet is being put together
// (started on the label page), so they don't clutter the pages otherwise.

function useCollecting() {
  const { isLoggedIn } = useAuth()
  const sheet = useLabelSheet()
  return { sheet, visible: isLoggedIn && sheet.collecting }
}

/** Adds an item or location to the label sheet, or takes it off again */
export function LabelSheetToggle({
  kind,
  id,
  name,
}: {
  kind: LabelEntryKind
  id: number
  name: string
}) {
  const { sheet, visible } = useCollecting()
  if (!visible) return null
  const added = sheet.has(kind, id)
  return (
    <Button
      variant={added ? "secondary" : "outline"}
      size="sm"
      aria-pressed={added}
      onClick={() =>
        added ? sheet.remove(kind, id) : sheet.add([{ kind, id, name }])
      }
    >
      {added ? (
        <CheckIcon className="w-4 h-4 mr-1" />
      ) : (
        <TagIcon className="w-4 h-4 mr-1" />
      )}
      {added ? "Auf dem Etikettenbogen" : "Auf den Etikettenbogen"}
    </Button>
  )
}

/** Adds a location and all its sublocations, e.g. a shelf with its boxes */
export function LabelSheetSubtreeButton({
  locationId,
}: {
  locationId: number
}) {
  const { sheet, visible } = useCollecting()
  const [loading, setLoading] = useState(false)
  if (!visible) return null
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const locations = await fetchLocationSubtree({ data: locationId })
          sheet.add(
            locations.map(({ id, name }) => ({ kind: "location", id, name })),
          )
          toast.success(`${locations.length} Orte auf dem Etikettenbogen`)
        } catch {
          toast.error("Die Unterorte konnten nicht geladen werden")
        } finally {
          setLoading(false)
        }
      }}
    >
      <ListTreeIcon className="w-4 h-4 mr-1" />
      Mit Unterorten
    </Button>
  )
}

/** Adds all items in a location and its sublocations */
export function LabelSheetItemsButton({ locationId }: { locationId: number }) {
  const { sheet, visible } = useCollecting()
  const [loading, setLoading] = useState(false)
  if (!visible) return null
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await addItemsInLocation(locationId, sheet.add)
        } finally {
          setLoading(false)
        }
      }}
    >
      <PackageIcon className="w-4 h-4 mr-1" />
      Alle Items darin
    </Button>
  )
}

/** Adds the items of a location and its sublocations, with feedback */
export async function addItemsInLocation(
  locationId: number,
  add: ReturnType<typeof useLabelSheet>["add"],
) {
  try {
    const items = await fetchItemsInLocation({ data: locationId })
    if (items.length === 0) {
      toast.info("An diesem Ort und darunter liegen keine Items")
      return
    }
    add(items.map(({ id, name }) => ({ kind: "item", id, name })))
    toast.success(`${items.length} Items auf dem Etikettenbogen`)
  } catch {
    toast.error("Die Items konnten nicht geladen werden")
  }
}

/** Header shortcut to the label page, with the number of labels */
export function LabelSheetIndicator() {
  const { sheet, visible } = useCollecting()
  if (!visible) return null
  return (
    <Button variant="outline" size="sm" asChild>
      <Link
        to="/labels"
        aria-label={`Etikettenbogen: ${sheet.labelCount} Etiketten`}
        title="Etikettenbogen"
      >
        <TagIcon className="w-4 h-4" />
        <span className="tabular-nums">{sheet.labelCount}</span>
      </Link>
    </Button>
  )
}
