import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Card, CardContent } from "@components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoxIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  Undo2Icon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  checkUndoConflict,
  fetchChangelogPaginated,
  undoChange,
} from "@/src/actions/changelogActions"
import type { ChangelogEntryWithUser, ChangeType, EntityType } from "@/src/app/types"

const searchSchema = {
  page: 1,
  highlight: undefined as number | undefined,
}

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
    highlight: search.highlight ? Number(search.highlight) : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => {
    return fetchChangelogPaginated({ data: { page: deps.page, pageSize: 50 } })
  },
  head: () => ({
    meta: [{ title: "Changelog | MSB Inventar" }],
  }),
})

function ChangelogPage() {
  const data = Route.useLoaderData()
  const { page, highlight } = Route.useSearch()
  const router = useRouter()

  const goToPage = (newPage: number) => {
    router.navigate({
      to: "/changelog",
      search: { page: newPage },
    })
  }

  return (
    <div className="container mx-auto px-4 my-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Changelog</h1>
        <div className="text-sm text-muted-foreground">
          {data.total} Einträge insgesamt
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Keine Änderungen vorhanden
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            {data.items.map((entry) => (
              <ChangelogEntryCard
                key={entry.id}
                entry={entry}
                isHighlighted={highlight === entry.id}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              Seite {page} von {data.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => goToPage(page + 1)}
              disabled={page >= data.totalPages}
            >
              Weiter
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function ChangelogEntryCard({
  entry,
  isHighlighted,
}: {
  entry: ChangelogEntryWithUser
  isHighlighted: boolean
}) {
  const [undoState, setUndoState] = useState<
    "idle" | "checking" | "undoing" | "blocked"
  >("idle")
  const [conflictId, setConflictId] = useState<number | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const router = useRouter()

  const handleUndoClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmUndo = async () => {
    setShowConfirmDialog(false)
    setUndoState("checking")

    const check = await checkUndoConflict({ data: entry.id })

    if (!check.canUndo) {
      setUndoState("blocked")
      setConflictId(check.conflictId || null)
      toast.error(check.conflictMessage || "Rückgängig nicht möglich")
      return
    }

    setUndoState("undoing")
    const result = await undoChange({ data: entry.id })

    if (result.success) {
      toast.success(
        result.action === "deleted"
          ? "Eintrag gelöscht"
          : "Änderung rückgängig gemacht"
      )
      router.invalidate()
    } else {
      toast.error(result.error || "Fehler beim Rückgängig machen")
      if (result.conflictId) {
        setConflictId(result.conflictId)
        setUndoState("blocked")
      } else {
        setUndoState("idle")
      }
    }
  }

  const formattedDate = new Date(entry.changedAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const formattedTime = new Date(entry.changedAt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const getUndoDescription = () => {
    const entityLabel = entry.entityType === "item" ? "Item" : "Location"
    const entityName = entry.entityName || `#${entry.entityId}`
    switch (entry.changeType) {
      case "create":
        return `${entityLabel} "${entityName}" wird gelöscht.`
      case "update":
        return `Die Änderungen an ${entityLabel} "${entityName}" werden rückgängig gemacht.`
      case "delete":
        return `${entityLabel} "${entityName}" wird wiederhergestellt.`
      default:
        return "Diese Änderung wird rückgängig gemacht."
    }
  }

  const hasDiffData = entry.beforeValues || entry.afterValues

  return (
    <>
      <div
        className={`border-b transition-all ${isHighlighted ? "bg-blue-500/10" : ""}`}
        id={`changelog-${entry.id}`}
      >
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 cursor-pointer hover:bg-muted/50"
          onClick={() => hasDiffData && setShowDiff(!showDiff)}
        >
          <ChangeTypeBadge type={entry.changeType} />
          <EntityTypeBadge type={entry.entityType} />
          <span className="font-medium text-sm truncate">
            {entry.entityName || `#${entry.entityId}`}
          </span>

          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {formattedDate}, {formattedTime}
            {entry.user && (
              <> · {entry.user.discordName || entry.user.name || "?"}</>
            )}
            {!entry.user && entry.userId === "admin" && <> · Admin</>}
            {!entry.user && entry.userId && entry.userId !== "admin" && (
              <span title={entry.userId}> · {entry.userId.slice(0, 6)}…</span>
            )}
          </span>

          {hasDiffData && (
            <ChevronDownIcon className={`w-3 h-3 text-muted-foreground transition-transform ${showDiff ? "rotate-180" : ""}`} />
          )}
        </div>

        {showDiff && hasDiffData && (
          <div className="px-2 pb-2 pt-1 border-t bg-muted/30">
            <ValueDiff
              changeType={entry.changeType}
              beforeValues={entry.beforeValues}
              afterValues={entry.afterValues}
              changedFields={entry.changedFields}
            />
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              {undoState === "blocked" && conflictId && (
                <Link
                  to="/changelog"
                  search={{ page: 1, highlight: conflictId }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Konflikt anzeigen
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs ml-auto"
                onClick={handleUndoClick}
                disabled={undoState === "checking" || undoState === "undoing"}
              >
                {undoState === "checking" || undoState === "undoing" ? (
                  <Loader2Icon className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Undo2Icon className="w-3 h-3 mr-1" />
                )}
                Rückgängig
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Änderung rückgängig machen?</DialogTitle>
            <DialogDescription>{getUndoDescription()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleConfirmUndo}>
              Ja, rückgängig machen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const config = {
    create: {
      label: "+",
      className: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
    },
    update: {
      label: "~",
      className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    delete: {
      label: "−",
      className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    },
  }

  const { label, className } = config[type] || {
    label: "?",
    className: "bg-gray-500/20",
  }

  return (
    <Badge variant="outline" className={`${className} px-1.5 py-0 text-xs font-mono`}>
      {label}
    </Badge>
  )
}

function EntityTypeBadge({ type }: { type: EntityType }) {
  const config = {
    item: {
      icon: BoxIcon,
    },
    location: {
      icon: MapPinIcon,
    },
  }

  const { icon: Icon } = config[type] || { icon: BoxIcon }

  return (
    <span className="text-muted-foreground">
      <Icon className="w-4 h-4" />
    </span>
  )
}

function formatFieldName(field: string): string {
  const fieldLabels: Record<string, string> = {
    name: "Name",
    description: "Beschreibung",
    locationId: "Location",
    parentLocationMarker: "Position",
    imagePath: "Bild",
    tags: "Tags",
    manufacturer: "Hersteller",
    model: "Modell",
    category: "Kategorie",
    links: "Links",
    morestuff: "Weitere Infos",
    parentId: "Übergeordnet",
  }
  return fieldLabels[field] || field
}

// Fields to exclude from diff display (internal/generated fields)
const EXCLUDED_FIELDS = [
  "searchVector",
  "searchableText",
  "createdAt",
  "updatedAt",
]

function ValueDiff({
  changeType,
  beforeValues,
  afterValues,
  changedFields,
}: {
  changeType: ChangeType
  beforeValues: Record<string, unknown> | null
  afterValues: Record<string, unknown> | null
  changedFields: string[] | null
}) {
  // For create: show all afterValues as additions
  if (changeType === "create" && afterValues) {
    const fields = Object.keys(afterValues).filter(
      (f) => !EXCLUDED_FIELDS.includes(f) && afterValues[f] != null
    )
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Erstellte Werte:
        </p>
        {fields.map((field) => (
          <DiffRow
            key={field}
            field={field}
            before={null}
            after={afterValues[field]}
            type="added"
          />
        ))}
      </div>
    )
  }

  // For delete: show all beforeValues as removals
  if (changeType === "delete" && beforeValues) {
    const fields = Object.keys(beforeValues).filter(
      (f) => !EXCLUDED_FIELDS.includes(f) && beforeValues[f] != null
    )
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Gelöschte Werte:
        </p>
        {fields.map((field) => (
          <DiffRow
            key={field}
            field={field}
            before={beforeValues[field]}
            after={null}
            type="removed"
          />
        ))}
      </div>
    )
  }

  // For update: show before/after for changed fields
  if (changeType === "update" && changedFields && beforeValues && afterValues) {
    const fields = changedFields.filter((f) => !EXCLUDED_FIELDS.includes(f))
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Geänderte Werte:
        </p>
        {fields.map((field) => (
          <DiffRow
            key={field}
            field={field}
            before={beforeValues[field]}
            after={afterValues[field]}
            type="changed"
          />
        ))}
      </div>
    )
  }

  return null
}

function DiffRow({
  field,
  before,
  after,
  type,
}: {
  field: string
  before: unknown
  after: unknown
  type: "added" | "removed" | "changed"
}) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "(leer)"
    if (typeof value === "string") return value || "(leer)"
    if (Array.isArray(value)) {
      if (value.length === 0) return "(leer)"
      return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")
    }
    if (typeof value === "object") return JSON.stringify(value, null, 2)
    return String(value)
  }

  const beforeStr = formatValue(before)
  const afterStr = formatValue(after)

  // Skip if both values are the same (for update type)
  if (type === "changed" && beforeStr === afterStr) return null

  // Check if array inline diff is applicable (both are arrays of primitives)
  const canArrayDiff =
    type === "changed" &&
    Array.isArray(before) &&
    Array.isArray(after) &&
    before.every((v) => typeof v === "string" || typeof v === "number") &&
    after.every((v) => typeof v === "string" || typeof v === "number")

  if (canArrayDiff) {
    const beforeSet = new Set((before as (string | number)[]).map(String))
    const afterSet = new Set((after as (string | number)[]).map(String))

    const removed = (before as (string | number)[]).filter((v) => !afterSet.has(String(v)))
    const added = (after as (string | number)[]).filter((v) => !beforeSet.has(String(v)))
    const unchanged = (after as (string | number)[]).filter((v) => beforeSet.has(String(v)))

    return (
      <div className="text-sm rounded-md overflow-hidden border">
        <div className="bg-muted/50 px-3 py-1.5 border-b">
          <span className="font-medium text-xs">{formatFieldName(field)}</span>
        </div>
        <div className="px-3 py-2 flex flex-wrap gap-1">
          {removed.map((item, i) => (
            <span
              key={`removed-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-500/30 text-red-700 dark:text-red-300 line-through"
            >
              {String(item)}
            </span>
          ))}
          {unchanged.map((item, i) => (
            <span
              key={`unchanged-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted"
            >
              {String(item)}
            </span>
          ))}
          {added.map((item, i) => (
            <span
              key={`added-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-500/30 text-green-700 dark:text-green-300"
            >
              {String(item)}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Check if inline diff is applicable (both are simple strings, not too long)
  const canInlineDiff =
    type === "changed" &&
    typeof before === "string" &&
    typeof after === "string" &&
    before &&
    after &&
    before.length < 500 &&
    after.length < 500

  if (canInlineDiff) {
    const diff = computeInlineDiff(before as string, after as string)
    return (
      <div className="text-sm rounded-md overflow-hidden border">
        <div className="bg-muted/50 px-3 py-1.5 border-b">
          <span className="font-medium text-xs">{formatFieldName(field)}</span>
        </div>
        <div className="px-3 py-2">
          <span className="break-all whitespace-pre-wrap text-xs">
            {diff.map((part, i) => (
              <span
                key={i}
                className={
                  part.type === "removed"
                    ? "bg-red-500/30 text-red-700 dark:text-red-300 line-through"
                    : part.type === "added"
                      ? "bg-green-500/30 text-green-700 dark:text-green-300"
                      : ""
                }
              >
                {part.text}
              </span>
            ))}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm rounded-md overflow-hidden border">
      <div className="bg-muted/50 px-3 py-1.5 border-b">
        <span className="font-medium text-xs">{formatFieldName(field)}</span>
      </div>
      <div className="divide-y">
        {(type === "removed" || type === "changed") && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10">
            <MinusIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-700 dark:text-red-300 break-all whitespace-pre-wrap text-xs">
              {beforeStr}
            </span>
          </div>
        )}
        {(type === "added" || type === "changed") && (
          <div className="flex items-start gap-2 px-3 py-2 bg-green-500/10">
            <PlusIcon className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-300 break-all whitespace-pre-wrap text-xs">
              {afterStr}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

type DiffPart = { type: "unchanged" | "added" | "removed"; text: string }

/**
 * Compute an inline word-level diff between two strings.
 * Uses a simple longest common subsequence approach on words.
 */
function computeInlineDiff(before: string, after: string): DiffPart[] {
  const beforeWords = tokenize(before)
  const afterWords = tokenize(after)

  // Build LCS table
  const m = beforeWords.length
  const n = afterWords.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeWords[i - 1] === afterWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find diff
  const result: DiffPart[] = []
  let i = m
  let j = n

  const tempResult: DiffPart[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeWords[i - 1] === afterWords[j - 1]) {
      tempResult.push({ type: "unchanged", text: beforeWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempResult.push({ type: "added", text: afterWords[j - 1] })
      j--
    } else {
      tempResult.push({ type: "removed", text: beforeWords[i - 1] })
      i--
    }
  }

  // Reverse and merge consecutive same-type parts
  tempResult.reverse()
  for (const part of tempResult) {
    const last = result[result.length - 1]
    if (last && last.type === part.type) {
      last.text += part.text
    } else {
      result.push({ ...part })
    }
  }

  return result
}

/**
 * Tokenize string into words while preserving whitespace as separate tokens.
 */
function tokenize(str: string): string[] {
  const tokens: string[] = []
  let current = ""
  let inWhitespace = false

  for (const char of str) {
    const isWs = /\s/.test(char)
    if (isWs !== inWhitespace && current) {
      tokens.push(current)
      current = ""
    }
    current += char
    inWhitespace = isWs
  }
  if (current) tokens.push(current)

  return tokens
}
