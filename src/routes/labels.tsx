import { addItemsInLocation } from "@components/labels/LabelSheetButtons"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { createFileRoute } from "@tanstack/react-router"
import {
  FileDownIcon,
  ListTreeIcon,
  PackageIcon,
  PlusIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"
import { searchItems } from "@/src/actions/itemActions"
import {
  fetchLabelData,
  fetchLocationSubtree,
} from "@/src/actions/labelActions"
import { searchLocations } from "@/src/actions/locationActions"
import { type LabelEntry, useLabelSheet } from "@/src/context/LabelSheetContext"
import { useDebounce } from "@/src/hooks/useDebounce"
import { requireLogin } from "@/src/lib/access"
import {
  findTemplate,
  LABEL_TEMPLATES,
  type LabelTemplate,
  labelsPerSheet,
  nextFreeLabel,
} from "@/src/lib/labelSheets"

export const Route = createFileRoute("/labels")({
  component: LabelsPage,
  beforeLoad: ({ context }) => requireLogin(context),
  head: () => ({ meta: [{ title: "Etiketten drucken | MSB Inventar" }] }),
})

// Per-browser settings: chosen sheet type, the next free label and the
// printer correction for each sheet type
type SheetSettings = {
  templateId: string
  startByTemplate: Record<string, number>
  offsetByTemplate: Record<string, { x: number; y: number }>
}

const SETTINGS_KEY = "msb-label-sheet-settings"
const DEFAULT_SETTINGS: SheetSettings = {
  templateId: LABEL_TEMPLATES[0].id,
  startByTemplate: {},
  offsetByTemplate: {},
}

function useSheetSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null")
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored })
    } catch {
      // Unreadable: keep the defaults
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Not remembered, but still usable
    }
  }, [settings, isLoaded])

  const template =
    findTemplate(settings.templateId) ?? (LABEL_TEMPLATES[0] as LabelTemplate)
  const start = Math.min(
    settings.startByTemplate[template.id] ?? 0,
    labelsPerSheet(template) - 1,
  )
  const offset = settings.offsetByTemplate[template.id] ?? { x: 0, y: 0 }

  return {
    template,
    start,
    offset,
    setTemplate: (templateId: string) =>
      setSettings((s) => ({ ...s, templateId })),
    setStart: (index: number) =>
      setSettings((s) => ({
        ...s,
        startByTemplate: { ...s.startByTemplate, [template.id]: index },
      })),
    setOffset: (next: { x: number; y: number }) =>
      setSettings((s) => ({
        ...s,
        offsetByTemplate: { ...s.offsetByTemplate, [template.id]: next },
      })),
  }
}

function LabelsPage() {
  const sheet = useLabelSheet()
  const settings = useSheetSettings()
  const [outlines, setOutlines] = useState(false)
  const [creating, setCreating] = useState(false)
  const templateSelectId = useId()

  const { template, start } = settings
  const perSheet = labelsPerSheet(template)
  const sheetCount =
    sheet.labelCount > 0 ? Math.ceil((start + sheet.labelCount) / perSheet) : 0

  const createPdf = async (labelsOnly: boolean) => {
    setCreating(true)
    try {
      const entries = labelsOnly ? sheet.entries : []
      const data = await fetchLabelData({
        data: {
          itemIds: entries.filter((e) => e.kind === "item").map((e) => e.id),
          locationIds: entries
            .filter((e) => e.kind === "location")
            .map((e) => e.id),
        },
      })
      // Without a configured address, use the one the app is opened under
      const baseUrl = data.baseUrl || window.location.origin
      const items = new Map(data.items.map((item) => [item.id, item]))
      const locations = new Map(data.locations.map((l) => [l.id, l]))

      const missing: string[] = []
      const labels = entries.flatMap((entry) => {
        const found =
          entry.kind === "item"
            ? items.get(entry.id) && {
                url: `${baseUrl}/i/${entry.id}`,
                name: items.get(entry.id)?.name ?? entry.name,
                path: null,
              }
            : locations.get(entry.id) && {
                url: `${baseUrl}/l/${entry.id}`,
                name: locations.get(entry.id)?.name ?? entry.name,
                path: locations.get(entry.id)?.path ?? [],
              }
        if (!found) {
          missing.push(entry.name)
          return []
        }
        return Array.from({ length: entry.copies }, () => found)
      })

      const { createLabelSheetPdf } = await import("@/src/lib/labelPdf")
      const pdf = await createLabelSheetPdf({
        template,
        labels,
        startIndex: start,
        offset: settings.offset,
        outlines: outlines || !labelsOnly,
        numbered: !labelsOnly,
      })

      const link = document.createElement("a")
      link.href = URL.createObjectURL(pdf)
      link.download = labelsOnly
        ? `etiketten-${new Date().toISOString().slice(0, 10)}.pdf`
        : `probeseite-${template.id}.pdf`
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000)

      if (missing.length > 0) {
        toast.warning(
          `Nicht mehr vorhanden, übersprungen: ${missing.join(", ")}`,
        )
      }
      if (labelsOnly && labels.length > 0) {
        settings.setStart(nextFreeLabel(labels.length, start, template))
        toast.success(
          "PDF erstellt. Beim Drucken „Tatsächliche Größe“ (100 %) wählen.",
        )
      }
    } catch (error) {
      console.error(error)
      toast.error("Das PDF konnte nicht erstellt werden")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Etiketten drucken</h1>
        <p className="text-muted-foreground">
          Erstellt ein PDF mit QR-Code-Etiketten für Items und Orte, passend für
          Etikettenbögen.
        </p>
      </div>

      <section aria-labelledby="sheet-heading" className="space-y-3">
        <h2 id="sheet-heading" className="text-lg font-semibold">
          1. Etikettenbogen
        </h2>
        <label htmlFor={templateSelectId} className="sr-only">
          Bogenvorlage
        </label>
        <select
          id={templateSelectId}
          value={template.id}
          onChange={(e) => settings.setTemplate(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {LABEL_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <PrintAdjustments
          offset={settings.offset}
          onOffsetChange={settings.setOffset}
          outlines={outlines}
          onOutlinesChange={setOutlines}
          onTestPage={() => createPdf(false)}
          disabled={creating}
        />
      </section>

      <section aria-labelledby="start-heading" className="space-y-3">
        <h2 id="start-heading" className="text-lg font-semibold">
          2. Erstes freies Etikett
        </h2>
        <p className="text-sm text-muted-foreground">
          Auf einem angebrochenen Bogen das erste freie Etikett anklicken.
        </p>
        <StartLabelGrid
          template={template}
          start={start}
          labelCount={sheet.labelCount}
          onSelect={settings.setStart}
        />
      </section>

      <section aria-labelledby="list-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="list-heading" className="text-lg font-semibold">
            3. Etiketten ({sheet.labelCount})
          </h2>
          {sheet.entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={sheet.clear}>
              <XIcon className="w-4 h-4 mr-1" />
              Liste leeren
            </Button>
          )}
        </div>
        <CollectingToggle />
        <AddEntries />
        <EntryList entries={sheet.entries} />
      </section>

      <section aria-labelledby="pdf-heading" className="space-y-3">
        <h2 id="pdf-heading" className="text-lg font-semibold">
          4. PDF erstellen
        </h2>
        <Button
          onClick={() => createPdf(true)}
          disabled={creating || sheet.labelCount === 0}
        >
          <FileDownIcon className="w-4 h-4 mr-2" />
          {creating ? "Erstelle PDF …" : "PDF erstellen"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {sheet.labelCount > 0
            ? `${sheet.labelCount} Etiketten auf ${sheetCount} ${
                sheetCount === 1 ? "Bogen" : "Bögen"
              }. `
            : ""}
          Beim Drucken „Tatsächliche Größe“ bzw. 100 % wählen, nicht „An Seite
          anpassen“, sonst sitzen die Etiketten nicht auf dem Bogen.
        </p>
      </section>
    </div>
  )
}

// Grid of the sheet's labels: click the first free one. Used labels are
// greyed out, the ones that will be printed on this sheet are highlighted.
function StartLabelGrid({
  template,
  start,
  labelCount,
  onSelect,
}: {
  template: LabelTemplate
  start: number
  labelCount: number
  onSelect: (index: number) => void
}) {
  const perSheet = labelsPerSheet(template)
  const row = Math.floor(start / template.columns) + 1
  const column = (start % template.columns) + 1
  return (
    <div className="space-y-2">
      <div
        className="grid gap-1 max-w-56 mx-auto p-2 border rounded-md bg-muted/30"
        style={{
          gridTemplateColumns: `repeat(${template.columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: perSheet }, (_, index) => {
          const used = index < start
          const printed = index >= start && index < start + labelCount
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: label positions are fixed
              key={index}
              type="button"
              aria-label={`Etikett ${index + 1}`}
              aria-pressed={index === start}
              onClick={() => onSelect(index)}
              className={`rounded-sm border text-xs tabular-nums transition-colors ${
                used
                  ? "bg-muted text-muted-foreground/50 border-dashed"
                  : printed
                    ? "bg-brand text-white border-brand"
                    : "bg-background hover:border-brand"
              } ${index === start ? "ring-2 ring-brand-text" : ""}`}
              style={{
                aspectRatio: `${template.labelWidth} / ${template.labelHeight}`,
              }}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Beginnt bei Etikett {start + 1} (Zeile {row}, Spalte {column})
      </p>
    </div>
  )
}

function PrintAdjustments({
  offset,
  onOffsetChange,
  outlines,
  onOutlinesChange,
  onTestPage,
  disabled,
}: {
  offset: { x: number; y: number }
  onOffsetChange: (offset: { x: number; y: number }) => void
  outlines: boolean
  onOutlinesChange: (outlines: boolean) => void
  onTestPage: () => void
  disabled: boolean
}) {
  const offsetXId = useId()
  const offsetYId = useId()
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">
        Feinjustierung für den Drucker
      </summary>
      <div className="mt-3 space-y-3 pl-4 border-l">
        <p className="text-muted-foreground">
          Verschiebt alle Etiketten, falls der Drucker versetzt druckt. Zum
          Prüfen eine Probeseite auf Normalpapier drucken und auf einen Bogen
          legen.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor={offsetXId}>Nach rechts (mm)</label>
            <Input
              id={offsetXId}
              type="number"
              step="0.5"
              value={offset.x}
              onChange={(e) =>
                onOffsetChange({ ...offset, x: Number(e.target.value) || 0 })
              }
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor={offsetYId}>Nach unten (mm)</label>
            <Input
              id={offsetYId}
              type="number"
              step="0.5"
              value={offset.y}
              onChange={(e) =>
                onOffsetChange({ ...offset, y: Number(e.target.value) || 0 })
              }
              className="w-20"
            />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={outlines}
            onChange={(e) => onOutlinesChange(e.target.checked)}
          />
          Rahmen um die Etiketten drucken
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={onTestPage}
          disabled={disabled}
        >
          Probeseite (nur Rahmen)
        </Button>
      </div>
    </details>
  )
}

function CollectingToggle() {
  const sheet = useLabelSheet()
  if (sheet.collecting) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-brand/60 bg-brand/15 p-3 text-sm">
        <TagIcon className="w-4 h-4 shrink-0" />
        <p className="flex-1 min-w-48">
          Sammeln ist aktiv: Auf Item- und Ortsseiten gibt es jetzt „Auf den
          Etikettenbogen“.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sheet.setCollecting(false)}
        >
          Sammeln beenden
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={() => sheet.setCollecting(true)}
      >
        <TagIcon className="w-4 h-4 mr-1" />
        Beim Stöbern sammeln
      </Button>
      <span className="text-muted-foreground">
        oder hier suchen und hinzufügen
      </span>
    </div>
  )
}

function AddEntries() {
  const sheet = useLabelSheet()
  const [query, setQuery] = useState("")
  const debounced = useDebounce(query.trim(), 250)
  const [results, setResults] = useState<{
    items: { id: number; name: string }[]
    locations: { id: number; name: string; path: string }[]
  } | null>(null)

  useEffect(() => {
    if (!debounced) {
      setResults(null)
      return
    }
    let current = true
    Promise.all([
      searchItems({ data: debounced }),
      searchLocations({ data: debounced }),
    ]).then(([items, locations]) => {
      if (current) {
        setResults({
          items: items.slice(0, 8),
          locations: locations.slice(0, 8),
        })
      }
    })
    return () => {
      current = false
    }
  }, [debounced])

  const addSubtree = async (locationId: number) => {
    try {
      const locations = await fetchLocationSubtree({ data: locationId })
      sheet.add(
        locations.map(({ id, name }) => ({ kind: "location", id, name })),
      )
      toast.success(`${locations.length} Orte hinzugefügt`)
    } catch {
      toast.error("Die Unterorte konnten nicht geladen werden")
    }
  }

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Items und Orte suchen …"
        aria-label="Items und Orte für Etiketten suchen"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results && (
        <ul
          aria-label="Suchergebnisse"
          className="border rounded-md divide-y max-h-80 overflow-y-auto"
        >
          {results.locations.map((location) => (
            <li key={`l${location.id}`} className="flex items-center gap-2 p-2">
              <Badge variant="secondary" className="font-normal">
                Ort
              </Badge>
              <span className="flex-1 min-w-0 truncate" title={location.path}>
                {location.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={sheet.has("location", location.id)}
                aria-label={`${location.name} hinzufügen`}
                onClick={() =>
                  sheet.add([
                    { kind: "location", id: location.id, name: location.name },
                  ])
                }
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${location.name} mit Unterorten hinzufügen`}
                title="Mit Unterorten"
                onClick={() => addSubtree(location.id)}
              >
                <ListTreeIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Alle Items in ${location.name} hinzufügen`}
                title="Alle Items darin (auch in Unterorten)"
                onClick={() => addItemsInLocation(location.id, sheet.add)}
              >
                <PackageIcon className="w-4 h-4" />
              </Button>
            </li>
          ))}
          {results.items.map((item) => (
            <li key={`i${item.id}`} className="flex items-center gap-2 p-2">
              <Badge variant="outline" className="font-normal">
                Item
              </Badge>
              <span className="flex-1 min-w-0 truncate">{item.name}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={sheet.has("item", item.id)}
                aria-label={`${item.name} hinzufügen`}
                onClick={() =>
                  sheet.add([{ kind: "item", id: item.id, name: item.name }])
                }
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
            </li>
          ))}
          {results.items.length + results.locations.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              Nichts gefunden
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function EntryList({ entries }: { entries: LabelEntry[] }) {
  const sheet = useLabelSheet()
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground border rounded-md border-dashed">
        <PackageIcon className="w-8 h-8 opacity-50" />
        <p>Noch keine Etiketten ausgewählt</p>
      </div>
    )
  }
  return (
    <ul aria-label="Etiketten" className="border rounded-md divide-y">
      {entries.map((entry) => (
        <li
          key={`${entry.kind}-${entry.id}`}
          className="flex items-center gap-2 p-2"
        >
          <Badge
            variant={entry.kind === "location" ? "secondary" : "outline"}
            className="font-normal"
          >
            {entry.kind === "location" ? "Ort" : "Item"}
          </Badge>
          <span className="flex-1 min-w-0 truncate">{entry.name}</span>
          <Input
            type="number"
            min={1}
            max={99}
            value={entry.copies}
            aria-label={`Anzahl für ${entry.name}`}
            onChange={(e) =>
              sheet.setCopies(entry.kind, entry.id, Number(e.target.value))
            }
            className="w-16"
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${entry.name} entfernen`}
            onClick={() => sheet.remove(entry.kind, entry.id)}
          >
            <Trash2Icon className="w-4 h-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
