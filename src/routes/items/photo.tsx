import { ItemList } from "@components/ItemList"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { createFileRoute, Link } from "@tanstack/react-router"
import imageCompression from "browser-image-compression"
import {
  CameraIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  SearchXIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { searchByPhotoFn } from "@/src/actions/aiActions"
import { categorySearchTerm } from "@/src/lib/searchQuery"

export const Route = createFileRoute("/items/photo")({
  component: PhotoSearchPage,
  // Each search costs an AI call, so it's for logged-in users only
  beforeLoad: ({ context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
  },
  head: () => ({ meta: [{ title: "Mit Foto suchen | MSB Inventar" }] }),
})

type SearchResult = Awaited<ReturnType<typeof searchByPhotoFn>>

type SearchState =
  | { status: "idle" }
  | { status: "searching"; photo: string }
  | { status: "done"; photo: string; result: SearchResult }
  | { status: "error"; photo: string; message: string }

function PhotoSearchPage() {
  const [state, setState] = useState<SearchState>({ status: "idle" })
  const cameraInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const search = async (file: File | undefined) => {
    if (!file) return
    try {
      // Small enough to upload quickly on mobile, big enough for the AI
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      })
      const photo = await imageCompression.getDataUrlFromFile(compressed)
      setState({ status: "searching", photo })
      try {
        const result = await searchByPhotoFn({ data: { base64Image: photo } })
        setState({ status: "done", photo, result })
      } catch (error) {
        setState({
          status: "error",
          photo,
          message:
            error instanceof Error
              ? error.message
              : "Die Suche ist fehlgeschlagen.",
        })
      }
    } catch {
      setState({
        status: "error",
        photo: "",
        message: "Das Foto konnte nicht gelesen werden.",
      })
    }
  }

  const busy = state.status === "searching"

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Mit Foto suchen</h1>
      <p className="text-muted-foreground mb-4">
        Fotografiere einen Gegenstand, um passende Items im Inventar zu finden.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => cameraInput.current?.click()} disabled={busy}>
          <CameraIcon className="w-4 h-4 mr-2" />
          Foto aufnehmen
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Foto auswählen
        </Button>
        {/* capture opens the camera on phones; the second input allows
            picking an existing photo instead */}
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            void search(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Foto für die Suche"
          onChange={(e) => {
            void search(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </div>

      {state.status !== "idle" && (
        <div className="flex gap-4 items-start mb-6">
          {state.photo && (
            <img
              src={state.photo}
              alt="Suchfoto"
              className="w-24 h-24 object-cover rounded-lg border shrink-0"
            />
          )}
          <div className="min-w-0">
            {state.status === "searching" && (
              <p
                role="status"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Loader2Icon className="w-4 h-4 animate-spin" />
                Foto wird erkannt …
              </p>
            )}
            {state.status === "error" && (
              <p role="alert" className="text-destructive">
                {state.message}
              </p>
            )}
            {state.status === "done" && (
              <Recognized description={state.result.description} />
            )}
          </div>
        </div>
      )}

      {state.status === "done" &&
        (state.result.results.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {state.result.results.length} passende
              {state.result.results.length === 1 ? "s Item" : " Items"}, beste
              Treffer zuerst
            </p>
            <ItemList items={state.result.results} />
          </>
        ) : (
          <NoMatch />
        ))}
    </div>
  )
}

// What the AI recognized, so it's clear why items match (or don't)
function Recognized({
  description,
}: {
  description: SearchResult["description"]
}) {
  return (
    <div className="space-y-2">
      <p>
        <span className="text-muted-foreground">Erkannt: </span>
        <span className="font-medium">{description.name || "–"}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {description.category && (
          <Badge variant="secondary" className="font-normal">
            <Link
              to="/items"
              search={{ q: categorySearchTerm(description.category) }}
            >
              Kategorie: {description.category}
            </Link>
          </Badge>
        )}
        {description.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="font-normal">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function NoMatch() {
  return (
    <div
      role="status"
      className="flex flex-col items-center text-center gap-3 py-10 border rounded-lg"
    >
      <SearchXIcon className="w-8 h-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Kein passendes Item gefunden</p>
        <p className="text-sm text-muted-foreground">
          Der Gegenstand ist wohl noch nicht im Inventar.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/items/add">
          <PlusIcon className="w-4 h-4 mr-2" />
          Neues Item anlegen
        </Link>
      </Button>
    </div>
  )
}
