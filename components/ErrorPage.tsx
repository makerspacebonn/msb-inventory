import { Button } from "@components/ui/button"
import { Link } from "@tanstack/react-router"
import { errorMessage, isAppError } from "@/src/lib/errors"

/**
 * Shown when a route can't load. Offers the login when that's what's
 * missing; other unexpected errors get a general message, as theirs may be
 * technical
 */
export function ErrorPage({ error }: { error: unknown }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold">
        {errorMessage(error, "Etwas ist schiefgelaufen.")}
      </h1>
      {isAppError(error, "UNAUTHORIZED") ? (
        <Button asChild>
          <Link to="/login">Anmelden</Link>
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link to="/">Zur Startseite</Link>
        </Button>
      )}
    </div>
  )
}
