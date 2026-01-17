import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@/src/context/AuthContext"
import { signIn, signUp } from "@/src/lib/auth-client"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Login | MSB Inventar" }],
  }),
})

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()
  const { refresh } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignUp) {
        const result = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        })
        if (result.error) {
          setError(result.error.message || "Registrierung fehlgeschlagen")
          setLoading(false)
          return
        }
      } else {
        const result = await signIn.email({
          email,
          password,
        })
        if (result.error) {
          setError(result.error.message || "Login fehlgeschlagen")
          setLoading(false)
          return
        }
      }

      await refresh()
      await router.invalidate()
      await navigate({ to: "/" })
    } catch {
      setError("Ein Fehler ist aufgetreten")
      setLoading(false)
    }
  }

  const handleAuthentikLogin = async () => {
    setLoading(true)
    setError("")
    try {
      await signIn.oauth2({
        providerId: "authentik",
        callbackURL: "/",
      })
    } catch {
      setError("Authentik Login fehlgeschlagen")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {isSignUp ? "Registrieren" : "Anmelden"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        <div>
          <Input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : isSignUp ? "Registrieren" : "Anmelden"}
        </Button>
        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError("")
            }}
          >
            {isSignUp
              ? "Bereits registriert? Anmelden"
              : "Noch kein Konto? Registrieren"}
          </button>
        </div>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Oder</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleAuthentikLogin}
        disabled={loading}
      >
        Mit Authentik anmelden
      </Button>
    </div>
  )
}
