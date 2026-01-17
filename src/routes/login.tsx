import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { useAuth } from "@/src/context/AuthContext"
import { signIn, signUp } from "@/src/lib/auth-client"

const getAuthConfig = createServerFn().handler(async () => {
  // Import dynamically to avoid bundling server code in client
  const { authentikConfigured } = await import("@/src/lib/auth")
  return { authentikConfigured }
})

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Login | MSB Inventar" }],
  }),
  loader: async () => {
    const config = await getAuthConfig()
    return { showAuthentik: config.authentikConfigured }
  },
})

function LoginPage() {
  const { showAuthentik } = Route.useLoaderData()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAuthentikLogin = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await signIn.oauth2({
        providerId: "authentik",
        callbackURL: "/",
      })
      // If we get here without redirect, there was an error
      if (result?.error) {
        setError(result.error.message || "Authentik Login fehlgeschlagen")
        setLoading(false)
      }
    } catch (err) {
      console.error("Authentik OAuth error:", err)
      setError(
        err instanceof Error ? err.message : "Authentik Login fehlgeschlagen",
      )
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Anmelden</h1>
      {error && <div>{error}</div>}
      {showAuthentik && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleAuthentikLogin}
          disabled={loading}
        >
          Mit Authentik anmelden
        </Button>
      )}
    </div>
  )
}
