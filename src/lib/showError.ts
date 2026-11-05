import { toast } from "sonner"
import { errorMessage, isAppError } from "./errors"

/**
 * Shows a failed action as a toast. A session that ran out gets a button
 * to log in again, as retrying won't help until then
 */
export function showError(error: unknown, fallback: string) {
  console.error(error)
  const message = errorMessage(error, fallback)

  if (isAppError(error, "UNAUTHORIZED")) {
    toast.error(message, {
      action: {
        label: "Anmelden",
        onClick: () => window.location.assign("/login"),
      },
    })
    return
  }
  toast.error(message)
}
