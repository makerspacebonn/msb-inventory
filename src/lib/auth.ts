import { createServerFn } from "@tanstack/react-start"
import { getCookie, setCookie } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import { UserTable } from "@/src/drizzle/schema"

const AUTH_COOKIE = "auth_token"
const USER_INFO_COOKIE = "user_info"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function createToken(userId: string): string {
  const secret = process.env.JWT_SECRET || "dev-secret"
  const data = `${userId}:${secret}:${Date.now()}`
  return Buffer.from(data).toString("base64")
}

function verifyToken(token: string): { valid: boolean; userId?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const secret = process.env.JWT_SECRET || "dev-secret"
    const parts = decoded.split(":")
    if (parts.length < 3) return { valid: false }
    if (parts[1] !== secret) return { valid: false }
    return { valid: true, userId: parts[0] }
  } catch {
    return { valid: false }
  }
}

function storeUserInfo(username: string, avatarUrl: string) {
  const userInfo = JSON.stringify({ username, avatarUrl })
  setCookie(USER_INFO_COOKIE, Buffer.from(userInfo).toString("base64"), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
}

function getUserInfo(): { username: string; avatarUrl: string } | null {
  const cookie = getCookie(USER_INFO_COOKIE)
  if (!cookie) return null

  try {
    const decoded = Buffer.from(cookie, "base64").toString()
    return JSON.parse(decoded)
  } catch {
    return null
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

    const token = createToken("admin")
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
  setCookie(USER_INFO_COOKIE, "", {
    httpOnly: false,
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
    return { isLoggedIn: false, userId: null }
  }
  const { valid, userId } = verifyToken(token)
  return { isLoggedIn: valid, userId: userId || null }
})

export const getCurrentUser = createServerFn().handler(async () => {
  const token = getCookie(AUTH_COOKIE)
  if (!token) {
    return null
  }

  const { valid, userId } = verifyToken(token)
  if (!valid || !userId) {
    return null
  }

  if (userId === "admin") {
    return null
  }

  const [user] = await db
    .select()
    .from(UserTable)
    .where(eq(UserTable.id, Number.parseInt(userId)))
    .limit(1)

  if (!user) {
    return null
  }

  const userInfo = getUserInfo()

  return {
    ...user,
    discordAvatar: userInfo?.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`,
  }
})


export const exchangeCodeForToken = createServerFn({ method: "POST" })
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }) => {
    try {
      const authentikUrl = process.env.AUTHENTIK_URL?.replace(/\/$/, '')
      const clientId = process.env.AUTHENTIK_CLIENT_ID
      const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET
      const baseUrl = process.env.BASE_URL
      const redirectUri = baseUrl + "/auth/callback"

      if (!authentikUrl || !clientId || !clientSecret || !baseUrl) {
        return { success: false, message: "Authentik nicht konfiguriert" }
      }

      const tokenUrl = `${authentikUrl}/application/o/token/`

      const requestBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      })

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody,
      })

      if (!tokenResponse.ok) {
        return { success: false, message: "Token-Austausch fehlgeschlagen" }
      }

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token

      const userInfoResponse = await fetch(`${authentikUrl}/application/o/userinfo/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!userInfoResponse.ok) {
        return { success: false, message: "Benutzerinformationen konnten nicht abgerufen werden" }
      }

      const userInfo = await userInfoResponse.json()

      const discordUsername = userInfo.username || userInfo.preferred_username || "Unknown"
      const discordAvatar = userInfo.avatar_url || userInfo.picture || `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`

      const [user] = await db
        .insert(UserTable)
        .values({
          discordId: userInfo.sub,
          discordName: discordUsername,
          name: userInfo.name || discordUsername,
        })
        .onConflictDoUpdate({
          target: UserTable.discordId,
          set: {
            discordName: discordUsername,
            name: userInfo.name || discordUsername,
          },
        })
        .returning()

      const sessionToken = createToken(user.id.toString())
      setCookie(AUTH_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      })

      storeUserInfo(discordUsername, discordAvatar)

      return { success: true }
    } catch (error) {
      return { success: false, message: "Ein Fehler ist aufgetreten" }
    }
  })
