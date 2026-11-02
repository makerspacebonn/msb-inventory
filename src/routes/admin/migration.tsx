// TEMPORARY: page for the one-time category and tag migration (AI-001/AI-002).
// Remove together with src/dataMigration after it ran on production.

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
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AlertTriangleIcon, CheckCircleIcon, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  previewMigration,
  runMigration,
} from "@/src/dataMigration/migrationActions"

export const Route = createFileRoute("/admin/migration")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  loader: () => previewMigration(),
  head: () => ({
    meta: [{ title: "Datenmigration | MSB Inventar" }],
  }),
})

function RouteComponent() {
  const { applied, itemCount, plan } = Route.useLoaderData()
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const categoryChanges = plan.changes.filter((c) =>
    c.changedFields.includes("category"),
  ).length
  const tagChanges = plan.changes.filter((c) =>
    c.changedFields.includes("tags"),
  ).length

  const handleRun = async () => {
    setIsRunning(true)
    try {
      const result = await runMigration({ data: plan.changes.length })
      toast.success(`Migration ausgeführt: ${result.changed} Items geändert`)
      setIsDialogOpen(false)
      await router.invalidate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Migration fehlgeschlagen",
      )
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Datenmigration: Kategorien & Tags</h1>

      {applied ? (
        <div className="flex items-center gap-2 p-4 border-2 border-green-700 rounded-lg">
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
          Die Migration wurde bereits ausgeführt.
        </div>
      ) : (
        <p className="text-muted-foreground">
          Vorschau: Es wurde noch nichts geändert. Alle Änderungen werden im
          Changelog als „Migration" protokolliert und können dort einzeln
          rückgängig gemacht werden.
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Items gesamt" value={itemCount} />
        <Stat label="Items geändert" value={plan.changes.length} />
        <Stat label="Neue Kategorie" value={categoryChanges} />
        <Stat label="Tags bereinigt" value={tagChanges} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Tags</h2>
        <p>
          {plan.tagStats.distinctBefore} → {plan.tagStats.distinctAfter}{" "}
          verschiedene Tags, {plan.tagStats.removed} Tag-Zuordnungen entfernt
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Kategorien danach</h2>
        <ul className="grid sm:grid-cols-2 gap-x-6">
          {plan.categoryCounts.map((c) => (
            <li key={c.name} className="flex justify-between border-b py-1">
              <span>{c.name}</span>
              <span className="text-muted-foreground">{c.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {plan.unknownCategories.length > 0 && (
        <Warning title="Unbekannte Kategorien (bleiben erhalten)">
          {plan.unknownCategories.map((u) => (
            <li key={u.name}>
              {u.name} ({u.count})
            </li>
          ))}
        </Warning>
      )}

      {plan.skippedOverrides.length > 0 && (
        <Warning title="Übersprungene Einzelkorrekturen">
          {plan.skippedOverrides.map((s) => (
            <li key={s.override.id}>
              #{s.override.id} {s.override.namePrefix} → {s.override.to}:{" "}
              {s.reason}
            </li>
          ))}
        </Warning>
      )}

      {plan.changes.length > 0 && (
        <details className="border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">
            Alle Änderungen ({plan.changes.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.changes.map((c) => (
              <li key={c.id} className="border-b pb-2">
                <div className="font-medium">
                  #{c.id} {c.name}
                </div>
                {c.changedFields.includes("category") && (
                  <div>
                    Kategorie: {c.before.category ?? "–"} →{" "}
                    <strong>{c.after.category}</strong>
                    {c.viaOverride && " (Einzelkorrektur)"}
                  </div>
                )}
                {c.removedTags.length > 0 && (
                  <div className="text-muted-foreground">
                    Tags entfernt: {c.removedTags.join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {!applied && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={plan.changes.length === 0}>
              Migration ausführen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Migration ausführen?</DialogTitle>
              <DialogDescription>
                {plan.changes.length} Items werden geändert. Die Migration kann
                nur einmal ausgeführt werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </DialogClose>
              <Button onClick={handleRun} disabled={isRunning}>
                {isRunning && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Ausführen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function Warning({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="p-4 border-2 border-yellow-600 rounded-lg">
      <h2 className="flex items-center gap-2 font-semibold mb-2">
        <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />
        {title}
      </h2>
      <ul className="list-disc pl-6 text-sm">{children}</ul>
    </section>
  )
}
