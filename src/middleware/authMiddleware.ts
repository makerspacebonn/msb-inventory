import { createMiddleware } from "@tanstack/react-start"

/**
 * Auth middleware that provides isLoggedIn and userId context to server functions.
 * Uses better-auth session validation.
 * This middleware does NOT block requests - it only provides auth state.
 * Use authGuardMiddleware for protected routes that require authentication.
 *
 * Note: Uses dynamic imports to avoid bundling server-only code in client.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { getRequest } = await import("@tanstack/react-start/server")
    const { auth } = await import("@/src/lib/auth")
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    return next({
      context: {
        isLoggedIn: !!session?.user,
        userId: session?.user?.id ?? null,
        user: session?.user ?? null,
      },
      sendContext: {
        isLoggedIn: !!session?.user,
      },
    })
  },
)

/**
 * Auth guard middleware that throws an error if the user is not authenticated.
 * Use this middleware for server functions that require authentication.
 */
export const authGuardMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (!context.isLoggedIn) {
      throw new Error("Unauthorized")
    }
    return next()
  })
