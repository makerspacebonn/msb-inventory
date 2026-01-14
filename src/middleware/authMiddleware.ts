import { createMiddleware } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"

const AUTH_COOKIE = "auth_token"

type TokenVerificationResult = {
  valid: boolean
  userId: string | null
}

function verifyToken(token: string): TokenVerificationResult {
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const secret = process.env.JWT_SECRET || "dev-secret"
    const parts = decoded.split(":")
    if (parts.length < 3) return { valid: false, userId: null }
    if (parts[1] !== secret) return { valid: false, userId: null }
    return { valid: true, userId: parts[0] }
  } catch {
    return { valid: false, userId: null }
  }
}

/**
 * Auth middleware that provides isLoggedIn and userId context to server functions.
 * This middleware does NOT block requests - it only provides auth state.
 * Use authGuardMiddleware for protected routes that require authentication.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = getCookie(AUTH_COOKIE)
    const result = token ? verifyToken(token) : { valid: false, userId: null }

    return next({
      context: {
        isLoggedIn: result.valid,
        userId: result.userId,
      },
      sendContext: {
        isLoggedIn: result.valid,
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
