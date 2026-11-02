import crypto from "node:crypto"
import { auth } from "@/src/lib/auth"

/**
 * One-click login for local development, as admin or as normal user.
 *
 * SECURITY: Only enabled when DEV_LOGIN=true AND NODE_ENV is not production.
 * No fixed credential exists: every login sets a fresh random password on the
 * dev account and signs in with it right away.
 */
export const devLoginEnabled =
  process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production"

export type DevRole = "admin" | "user"

const DEV_ACCOUNTS = {
  admin: { email: "dev-admin@example.com", name: "Dev Admin" },
  user: { email: "dev-user@example.com", name: "Dev User" },
} satisfies Record<DevRole, { email: string; name: string }>

export async function signInAsDevUser(
  role: DevRole,
  headers: Headers,
): Promise<void> {
  if (!devLoginEnabled) {
    throw new Error("Dev login is disabled")
  }

  const account = DEV_ACCOUNTS[role]

  const ctx = await auth.$context
  const password = crypto.randomBytes(24).toString("base64url")
  const hashedPassword = await ctx.password.hash(password)

  const existing = await ctx.internalAdapter.findUserByEmail(account.email)
  const user =
    existing?.user ??
    (await ctx.internalAdapter.createUser(
      {
        email: account.email,
        name: account.name,
        emailVerified: true,
      },
      { method: "admin" },
    ))

  // Re-assert the role on every login, in case it was changed meanwhile
  await ctx.internalAdapter.updateUser(user.id, { role })

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
    body: { email: account.email, password },
    headers,
  })
}
