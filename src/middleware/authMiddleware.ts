import { createMiddleware } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"

const AUTH_COOKIE = "auth_token"

function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const secret = process.env.JWT_SECRET || "dev-secret"
    const parts = decoded.split(":")
    if (parts.length < 3) return false
    return parts[1] === secret
  } catch {
    return false
  }
}

/**
 * Auth middleware that provides isLoggedIn context to server functions.
 * This middleware does NOT block requests - it only provides auth state.
 * Use authGuardMiddleware for protected routes that require authentication.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = getCookie(AUTH_COOKIE)
    const isLoggedIn = token ? verifyToken(token) : false

    return next({
      context: {
        isLoggedIn,
      },
      sendContext: {
        isLoggedIn,
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
