import { createServerFn } from "@tanstack/react-start"
import { getCookie, setCookie } from "@tanstack/react-start/server"

const AUTH_COOKIE = "auth_token"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Simple token: just a hash of password + secret
function createToken(password: string): string {
  const secret = process.env.JWT_SECRET || "dev-secret"
  const data = `${password}:${secret}:${Date.now()}`
  return Buffer.from(data).toString("base64")
}

function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const secret = process.env.JWT_SECRET || "dev-secret"
    // Token format: password:secret:timestamp
    const parts = decoded.split(":")
    if (parts.length < 3) return false
    // Check if secret matches
    return parts[1] === secret
  } catch {
    return false
  }
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((password: string) => password)
  .handler(async ({ data: password }) => {
    const correctPassword = process.env.EDITOR_PASSWORD
    if (!correctPassword) {
      return { success: false, message: "EDITOR_PASSWORD not configured" }
    }

    if (password !== correctPassword) {
      return { success: false, message: "Falsches Passwort" }
    }

    const token = createToken(password)
    setCookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })

    return { success: true }
  })

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  setCookie(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return { success: true }
})

export const checkAuth = createServerFn().handler(async () => {
  const token = getCookie(AUTH_COOKIE)
  if (!token) {
    return { isLoggedIn: false }
  }
  return { isLoggedIn: verifyToken(token) }
})

// Note: Authentication guard is now handled by authGuardMiddleware
// Use .middleware([authGuardMiddleware]) on server functions that require auth