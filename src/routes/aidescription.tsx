import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import imageCompression from "browser-image-compression"
import { useState } from "react"
import { describeImageFn } from "@/src/actions/aiActions"

const queryClient = new QueryClient()

export const Route = createFileRoute("/aidescription")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ImageUploader />
    </QueryClientProvider>
  )
}

export function ImageUploader() {
  const [data, setData] = useState<any>(null)

  const mutation = useMutation({
    mutationFn: describeImageFn,
    onSuccess: (res) => {
      console.log(res)
      if (!Array.isArray(res)) {
        res = [res]
      }
      setData(res)
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // 1. Bild verkleinern (Optionen)
      const options = {
        maxSizeMB: 0.5, // Ziel: 500KB
        maxWidthOrHeight: 1024, // Max 1024px
        useWebWorker: true,
      }

      console.log("Originalgröße:", file.size / 1024 / 1024, "MB")
      const compressedFile = await imageCompression(file, options)
      console.log("Neue Größe:", compressedFile.size / 1024 / 1024, "MB")

      // 2. In Base64 umwandeln für die API
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile)

      // 3. An Server Function senden
      console.log(base64)
      mutation.mutate({ data: base64 })
    } catch (error) {
      console.error("Fehler bei der Kompression:", error)
    }
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-white shadow-sm">
      <label className="block font-medium text-gray-700">
        Gegenstand fotografieren/hochladen
      </label>
      <input
        type="file"
        accept="image/*"
        capture="environment" // Öffnet auf dem Handy direkt die Kamera
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {mutation.isPending && (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          <span>KI analysiert und kategorisiert...</span>
        </div>
      )}

      {data?.map((item) => (
        <div
          key={item.bezeichnung}
          className="mt-4 p-4 bg-green-50 rounded-md border border-green-200"
        >
          <h3 className="font-bold text-green-800">Vorschlag für Inventar:</h3>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-black">
            <span className="font-semibold">Name:</span>{" "}
            <span>{item.bezeichnung}</span>
            <span className="font-semibold">Kategorie:</span>{" "}
            <span>{item.kategorie}</span>
            <span className="font-semibold">Hersteller:</span>{" "}
            <span>{item.hersteller}</span>
            <span className="font-semibold">Modell:</span>{" "}
            <span>{item.modell}</span>
            <span className="font-semibold">Zustand:</span>{" "}
            <span>{item.zustand}</span>
            <span className="font-semibold">Beschreibung:</span>{" "}
            <span className="col-span-2 italic">{item.beschreibung_kurz}</span>
            <div>{item.zusatzinfos}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
