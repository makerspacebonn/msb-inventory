import { Button } from "@components/ui/button"
import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { signIn } from "@/src/lib/auth-client"

const getAuthConfig = createServerFn().handler(async () => {
  // Import dynamically to avoid bundling server code in client
  const { authentikConfigured, kanidmConfigured } = await import(
    "@/src/lib/auth"
  )
  return { authentikConfigured, kanidmConfigured }
})

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Login | MSB Inventar" }],
  }),
  loader: async () => {
    const config = await getAuthConfig()
    return {
      showAuthentik: config.authentikConfigured,
      showKanidm: config.kanidmConfigured,
    }
  },
})

function LoginPage() {
  const { showAuthentik, showKanidm } = Route.useLoaderData()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleOAuthLogin = async (
    providerId: "authentik" | "kanidm",
    label: string,
  ) => {
    setLoading(true)
    setError("")
    try {
      const result = await signIn.social({
        provider: providerId,
        callbackURL: "/",
      })
      // If we get here without redirect, there was an error
      if (result?.error) {
        setError(result.error.message || `${label} Login fehlgeschlagen`)
        setLoading(false)
      }
    } catch (err) {
      console.error(`${label} OAuth error:`, err)
      setError(
        err instanceof Error ? err.message : `${label} Login fehlgeschlagen`,
      )
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Anmelden</h1>
      {error && <div>{error}</div>}
      <div className="flex flex-col gap-3">
        {showAuthentik && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin("authentik", "Authentik")}
            disabled={loading}
          >
            Mit Authentik anmelden
          </Button>
        )}
        {showKanidm && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin("kanidm", "Kanidm")}
            disabled={loading}
          >
            Mit Kanidm anmelden
          </Button>
        )}
      </div>
    </div>
  )
}
