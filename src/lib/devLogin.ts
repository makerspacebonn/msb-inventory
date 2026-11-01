import crypto from "node:crypto"
import { auth } from "@/src/lib/auth"

/**
 * One-click admin login for local development.
 *
 * SECURITY: Only enabled when DEV_LOGIN=true AND NODE_ENV is not production.
 * No fixed credential exists: every login sets a fresh random password on the
 * dev admin account and signs in with it right away.
 */
export const devLoginEnabled =
  process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production"

const DEV_ADMIN = { email: "dev-admin@example.com", name: "Dev Admin" }

export async function signInAsDevAdmin(headers: Headers): Promise<void> {
  if (!devLoginEnabled) {
    throw new Error("Dev login is disabled")
  }

  const ctx = await auth.$context
  const password = crypto.randomBytes(24).toString("base64url")
  const hashedPassword = await ctx.password.hash(password)

  const existing = await ctx.internalAdapter.findUserByEmail(DEV_ADMIN.email)
  const user =
    existing?.user ??
    (await ctx.internalAdapter.createUser(
      {
        email: DEV_ADMIN.email,
        name: DEV_ADMIN.name,
        emailVerified: true,
      },
      { method: "admin" },
    ))

  // Re-assert admin on every login, in case the role was changed meanwhile
  await ctx.internalAdapter.updateUser(user.id, { role: "admin" })

  if (await ctx.internalAdapter.findCredentialAccount(user.id)) {
    await ctx.internalAdapter.updatePassword(user.id, hashedPassword)
  } else {
    await ctx.internalAdapter.linkAccount({
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: hashedPassword,
    })
  }

  // tanstackStartCookies sets the session cookie on the current response
  await auth.api.signInEmail({
    body: { email: DEV_ADMIN.email, password },
    headers,
  })
}
