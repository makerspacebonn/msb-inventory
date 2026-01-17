import { createServerFn } from "@tanstack/react-start"

// Server function to get auth context - uses dynamic imports to avoid client bundling issues
export const getAuthContext = createServerFn().handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server")
  const { auth } = await import("@/src/lib/auth")
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  return {
    isLoggedIn: !!session?.user,
    userId: session?.user?.id ?? null,
  }
})
