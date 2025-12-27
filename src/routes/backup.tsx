import { Button } from "@components/ui/button"
import { createFileRoute } from "@tanstack/react-router"
import { Download, Loader2, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  type BackupInfo,
  deleteBackup,
  generateBackup,
  listBackups,
  restoreBackup,
} from "@/src/actions/backupActions"

export const Route = createFileRoute("/backup")({
  component: BackupPage,
  loader: () => listBackups(),
})

function BackupPage() {
  const initialBackups = Route.useLoaderData()
  const [backups, setBackups] = useState<BackupInfo[]>(initialBackups)
  const [isGenerating, setIsGenerating] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [restoringFile, setRestoringFile] = useState<string | null>(null)
  const [restoreResult, setRestoreResult] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const newBackup = await generateBackup()
      setBackups((prev) => [newBackup, ...prev])
    } catch (error) {
      console.error("Backup generation failed:", error)
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
      console.error("Backup deletion failed:", error)
    } finally {
      setDeletingFile(null)
    }
  }

  const handleRestore = async (filename: string) => {
    if (!confirm(`Backup "${filename}" wiederherstellen? Alle aktuellen Daten werden überschrieben!`)) {
      return
    }
    setRestoringFile(filename)
    setRestoreResult(null)
    try {
      const result = await restoreBackup({ data: filename })
      setRestoreResult(
        `Wiederherstellung erfolgreich: ${result.locationsRestored} Standorte, ${result.itemsRestored} Items, ${result.imagesRestored} Bilder`,
      )
    } catch (error) {
      console.error("Restore failed:", error)
      setRestoreResult("Wiederherstellung fehlgeschlagen")
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
      <h1>Backup</h1>
      <div className="mb-6">
        <Button onClick={handleGenerate} disabled={isGenerating}>
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
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{backup.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(backup.createdAt)} &middot; {backup.sizeFormatted}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/backup/download/${backup.filename}`} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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
                  onClick={() => handleDelete(backup.filename)}
                  disabled={deletingFile === backup.filename}
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
    </>
  )
}
