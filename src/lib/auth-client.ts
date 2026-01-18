import { adminClient, genericOAuthClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [genericOAuthClient(), adminClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
