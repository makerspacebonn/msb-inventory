import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { createFileRoute } from "@tanstack/react-router"
import { Download, Loader2, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  type BackupInfo,
  deleteBackup,
  generateBackup,
  listBackups,
  type RestoreResult,
  restoreBackup,
} from "@/src/actions/backupActions"
import { requireAdmin } from "@/src/lib/access"
import { errorMessage } from "@/src/lib/errors"
import { showError } from "@/src/lib/showError"

export const Route = createFileRoute("/backup")({
  component: BackupPage,
  beforeLoad: ({ context }) => requireAdmin(context),
  loader: () => listBackups(),
  head: () => ({
    meta: [{ title: "Backup | MSB Inventar" }],
  }),
})

function BackupPage() {
  const initialBackups = Route.useLoaderData()
  const [backups, setBackups] = useState<BackupInfo[]>(initialBackups)
  const [isGenerating, setIsGenerating] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [restoringFile, setRestoringFile] = useState<string | null>(null)
  const [restoreResult, setRestoreResult] = useState<string | null>(null)
  // The backup waiting for the user to confirm its deletion
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const newBackup = await generateBackup()
      setBackups((prev) => [newBackup, ...prev])
    } catch (error) {
      showError(error, "Das Backup konnte nicht erstellt werden.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (filename: string) => {
    setDeletingFile(filename)
    try {
      await deleteBackup({ data: filename })
      setBackups((prev) => prev.filter((b) => b.filename !== filename))
    } catch (error) {
      showError(error, "Das Backup konnte nicht gelöscht werden.")
    } finally {
      setDeletingFile(null)
    }
  }

  const handleRestore = async (filename: string) => {
    if (
      !confirm(
        `Backup "${filename}" wiederherstellen? Alle aktuellen Daten werden überschrieben!`,
      )
    ) {
      return
    }
    setRestoringFile(filename)
    setRestoreResult(null)
    try {
      const result = await restoreBackup({ data: filename })
      setRestoreResult(restoreSummary(result))
    } catch (error) {
      console.error("Restore failed:", error)
      setRestoreResult(errorMessage(error, "Wiederherstellung fehlgeschlagen"))
    } finally {
      setRestoringFile(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Backup</h1>
      <div className="mb-6">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Backup wird erstellt...
            </>
          ) : (
            "Neues Backup erstellen"
          )}
        </Button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Verfügbare Backups</h2>

      {restoreResult && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p>{restoreResult}</p>
        </div>
      )}

      {backups.length === 0 ? (
        <p className="text-muted-foreground">Keine Backups vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <div
              key={backup.filename}
              data-testid="backup-row"
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                {/* A long name without spaces: wraps anywhere, instead of
                    pushing the page wider than a phone */}
                <p className="break-all font-medium">{backup.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(backup.createdAt)} &middot; {backup.sizeFormatted}
                </p>
              </div>
              {/* On phones a row of large buttons, with the delete button
                  apart at the end */}
              <div className="grid shrink-0 grid-cols-[1fr_1fr_auto] gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 sm:h-8"
                  asChild
                >
                  <a href={`/backup/download/${backup.filename}`} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 sm:h-8"
                  onClick={() => handleRestore(backup.filename)}
                  disabled={restoringFile === backup.filename}
                >
                  {restoringFile === backup.filename ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-11 w-11 sm:h-8 sm:w-auto"
                  onClick={() => setConfirmingDelete(backup.filename)}
                  disabled={deletingFile === backup.filename}
                  aria-label="Backup löschen"
                >
                  {deletingFile === backup.filename ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={confirmingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup löschen</DialogTitle>
            <DialogDescription className="break-all">
              Möchtest du "{confirmingDelete}" wirklich löschen? Das kann nicht
              rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDelete(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmingDelete) handleDelete(confirmingDelete)
                setConfirmingDelete(null)
              }}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function restoreSummary(result: RestoreResult): string {
  const parts = [
    `${result.locationsRestored} Standorte`,
    `${result.itemsRestored} Items`,
    `${result.categoriesRestored} Kategorien`,
    `${result.changelogRestored} Änderungen`,
    result.searchDaysRestored === null
      ? "Suchstatistik unverändert (älteres Backup)"
      : `Suchstatistik für ${result.searchDaysRestored} Tage`,
    result.itemViewsRestored === null
      ? "keine Aufrufe (älteres Backup)"
      : `${result.itemViewsRestored} Einträge zu Aufrufen`,
    `${result.usersAdded} neue Benutzer`,
    `${result.imagesRestored} Bilder`,
  ]
  return `Wiederherstellung erfolgreich: ${parts.join(", ")}`
}
