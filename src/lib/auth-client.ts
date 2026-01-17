import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [genericOAuthClient()],
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
