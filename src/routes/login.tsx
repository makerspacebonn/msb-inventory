import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { useServerFn } from "@tanstack/react-start"
import { useAuth } from "@/src/context/AuthContext"
import { login, redirectToOAuth } from "@/src/lib/auth"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Login | MSB Inventar" }],
  }),
})

function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()
  const { refresh } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await login({ data: password })
      if (result.success) {
        await refresh()
        await router.invalidate()
        await navigate({ to: "/" })
      } else {
        setError(result.message || "Login fehlgeschlagen")
      }
    } catch {
      setError("Ein Fehler ist aufgetreten")
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthRedirect = useServerFn(redirectToOAuth)

  const handleDiscordLogin = async () => {
    setLoading(true)
    setError("")
    try {
      await handleOAuthRedirect()
    } catch {
      setError("OAuth nicht konfiguriert")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : "Anmelden"}
        </Button>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Oder
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleDiscordLogin}
          disabled={loading}
        >
          Mit Authentik anmelden
        </Button>
      </form>
    </div>
  )
}
