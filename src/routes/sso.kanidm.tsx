import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/src/context/AuthContext"
import { signIn } from "@/src/lib/auth-client"

// SSO landing route for Kanidm's app portal ("IdP-initiated" launch).
//
// OIDC is SP-initiated: the app must start the handshake — Kanidm cannot push a
// session into it. Clicking the app tile in Kanidm only drops the browser at a
// URL. Point Kanidm's landing URL at THIS route:
//   kanidm system oauth2 set-landing-url msb-inventory \
//     https://<app-origin>/sso/kanidm
// On load it immediately kicks off the Kanidm OAuth flow; with an existing
// Kanidm session that completes without a prompt and returns the user to "/"
// already logged in.
export const Route = createFileRoute("/sso/kanidm")({
  component: SsoKanidm,
  head: () => ({
    meta: [{ title: "Anmeldung… | MSB Inventar" }],
  }),
})

function SsoKanidm() {
  const navigate = useNavigate()
  const { isLoggedIn, isLoading } = useAuth()
  const [error, setError] = useState("")
  // Guard against React StrictMode's double-invoke starting the flow twice.
  const started = useRef(false)

  useEffect(() => {
    // Wait until the session state is resolved before deciding.
    if (isLoading || started.current) return
    started.current = true

    // Already have an app session — nothing to do, go to the start page.
    if (isLoggedIn) {
      navigate({ to: "/" })
      return
    }

    signIn
      .social({ provider: "kanidm", callbackURL: "/" })
      .then((result) => {
        if (result?.error) {
          started.current = false
          setError(result.error.message || "Kanidm Login fehlgeschlagen")
        }
      })
      .catch((err) => {
        started.current = false
        setError(
          err instanceof Error ? err.message : "Kanidm Login fehlgeschlagen",
        )
      })
  }, [isLoading, isLoggedIn, navigate])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      {error ? (
        <>
          <p className="text-destructive">{error}</p>
          <Link to="/login" className="underline">
            Zur Anmeldung
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Weiterleitung zur Anmeldung…</p>
        </>
      )}
    </div>
  )
}
