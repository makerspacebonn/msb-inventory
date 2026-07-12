import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, genericOAuth } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import * as schema from "@/src/drizzle/schema"

// Standard OIDC claims we read from IdP profiles. The conditional-spread
// provider config below defeats better-auth's inference, so annotate explicitly.
type OidcProfile = {
  name?: string
  preferred_username?: string
  email?: string
  picture?: string
  sub?: string
}

// Check if Authentik is configured
export const authentikConfigured = !!(
  process.env.AUTHENTIK_CLIENT_ID &&
  process.env.AUTHENTIK_CLIENT_SECRET &&
  process.env.AUTHENTIK_URL
)

// Check if Kanidm is configured
export const kanidmConfigured = !!(
  process.env.KANIDM_CLIENT_ID &&
  process.env.KANIDM_CLIENT_SECRET &&
  process.env.KANIDM_URL
)

// Kanidm group whose members become app admins. Kanidm must be configured to
// emit a `groups` claim containing this value (see .env_example / CLAUDE.md).
const KANIDM_ADMIN_GROUP = process.env.KANIDM_ADMIN_GROUP || "zeug-admin"

// Decode a JWT payload WITHOUT verifying the signature: the token came straight
// from Kanidm's token endpoint over TLS and was already validated by better-auth
// before it was stored, so re-verifying here adds nothing.
function decodeJwtPayload(
  token?: string | null,
): Record<string, unknown> | null {
  const payload = token?.split(".")[1]
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }
}

// Sync a user's role from their Kanidm group membership. Fires from the account
// create/update hooks, which receive the full account row (userId, providerId,
// idToken) on both first link and every subsequent login. Kanidm login is
// authoritative: members of KANIDM_ADMIN_GROUP get "admin", everyone else is
// reset to "user" so revoked membership is reflected on next login. Wrapped so a
// role-sync failure can never break the login itself (it runs post-commit).
async function syncKanidmRole(account: {
  providerId?: string
  userId?: string
  idToken?: string | null
}): Promise<void> {
  if (account.providerId !== "kanidm" || !account.userId) return
  try {
    const claims = decodeJwtPayload(account.idToken)

    // DEBUG: surface exactly what Kanidm returned so group/claim-map setup is
    // verifiable. Look for a `groups` claim here after configuring the claim-map.
    console.log("═══════════════════════════════════════════════════════")
    console.log("🔐 KANIDM id_token claims")
    console.log("═══════════════════════════════════════════════════════")
    console.log(JSON.stringify(claims, null, 2))
    console.log("═══════════════════════════════════════════════════════")

    if (!claims) return
    const rawGroups = (claims as { groups?: unknown }).groups
    const groups = Array.isArray(rawGroups) ? rawGroups.map(String) : []
    const role = groups.includes(KANIDM_ADMIN_GROUP) ? "admin" : "user"
    console.log(
      `🔐 KANIDM role mapping: groups=${JSON.stringify(groups)} adminGroup="${KANIDM_ADMIN_GROUP}" -> role="${role}"`,
    )

    await db
      .update(schema.UserTable)
      .set({ role })
      .where(eq(schema.UserTable.id, account.userId))
  } catch (err) {
    console.error("🔐 KANIDM role sync failed:", err)
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.UserTable,
      session: schema.SessionTable,
      account: schema.AccountTable,
      verification: schema.VerificationTable,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["authentik", "kanidm"], // Trust IdP email verification
      // Allow linking a trusted IdP account to an existing local user even when
      // that local user's email was never verified (e.g. earlier Authentik or
      // password signups). Without this, better-auth returns account_not_linked.
      requireLocalEmailVerified: false,
    },
  },
  // Map Kanidm group membership -> app role on every login.
  databaseHooks: {
    account: {
      create: {
        async after(account) {
          await syncKanidmRole(account)
        },
      },
      update: {
        async after(account) {
          await syncKanidmRole(account)
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : ["http://localhost:3000"],
  plugins: [
    admin(),
    // Conditionally add OAuth providers (Authentik and/or Kanidm)
    ...(authentikConfigured || kanidmConfigured
      ? [
          genericOAuth({
            config: [
              ...(authentikConfigured
                ? [
                    {
                      providerId: "authentik",
                      clientId: process.env.AUTHENTIK_CLIENT_ID!,
                      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
                      discoveryUrl: `${process.env.AUTHENTIK_URL}/application/o/${process.env.AUTHENTIK_APP_SLUG || "msb-inventory"}/.well-known/openid-configuration`,
                      scopes: [],
                      mapProfileToUser: (profile: OidcProfile) => {
                        // DEBUG: Log complete OIDC profile from Authentik
                        console.log(
                          "═══════════════════════════════════════════════════════",
                        )
                        console.log("🔐 AUTHENTIK OIDC PROFILE DATA")
                        console.log(
                          "═══════════════════════════════════════════════════════",
                        )
                        console.log(JSON.stringify(profile, null, 2))
                        console.log(
                          "═══════════════════════════════════════════════════════",
                        )

                        return {
                          name: profile.name || profile.preferred_username,
                          // Generate synthetic email if not provided by Authentik
                          // Uses sub (unique user ID) to ensure uniqueness
                          email:
                            profile.email || `${profile.sub}@authentik.local`,
                          image: profile.picture,
                        }
                      },
                      overrideUserInfo: true,
                    },
                  ]
                : []),
              ...(kanidmConfigured
                ? [
                    {
                      providerId: "kanidm",
                      clientId: process.env.KANIDM_CLIENT_ID!,
                      clientSecret: process.env.KANIDM_CLIENT_SECRET!,
                      // Kanidm OIDC discovery lives under /oauth2/openid/<client-id>/
                      discoveryUrl: `${process.env.KANIDM_URL}/oauth2/openid/${process.env.KANIDM_CLIENT_ID}/.well-known/openid-configuration`,
                      // Kanidm emits the group claim via a claim-map (not a custom
                      // scope), so only standard scopes are requested here.
                      scopes: ["openid", "email", "profile"],
                      // Kanidm requires PKCE by default
                      pkce: true,
                      mapProfileToUser: (profile: OidcProfile) => ({
                        name: profile.name || profile.preferred_username,
                        // Kanidm always returns a real, verified email
                        email: profile.email,
                        image: profile.picture,
                      }),
                      overrideUserInfo: true,
                    },
                  ]
                : []),
            ],
          }),
        ]
      : []),
    // tanstackStartCookies MUST be last - required for TanStack Start cookie handling
    tanstackStartCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
