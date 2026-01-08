import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/src/context/AuthContext"
import { exchangeCodeForToken } from "@/src/lib/auth"

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const [error, setError] = useState("")
  const [processing, setProcessing] = useState(true)
  const navigate = useNavigate()
  const router = useRouter()
  const { refresh } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) {
      return
    }
    hasRun.current = true

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")
        const state = params.get("state")

        if (!state) {
          setError("Kein State-Parameter erhalten")
          setProcessing(false)
          return
        }

        if (!code) {
          setError("Kein Autorisierungscode erhalten")
          setProcessing(false)
          return
        }

        const result = await exchangeCodeForToken({ data: code })

        if (result.success) {
          await refresh()
          await router.invalidate()
          await navigate({ to: "/" })
        } else {
          setError(result.message || "Login fehlgeschlagen")
          setProcessing(false)
        }
      } catch (err) {
        setError("Ein Fehler ist beim Login aufgetreten")
        setProcessing(false)
      }
    }

    handleCallback()
  }, [navigate, router, refresh])

  if (processing) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-lg">Anmeldung wird verarbeitet...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
          <p className="font-bold">Fehler</p>
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="text-blue-500 hover:underline"
        >
          Zurück zum Login
        </button>
      </div>
    )
  }

  return null
}

