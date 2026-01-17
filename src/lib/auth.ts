import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { genericOAuth } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { db } from "@/src/db"
import * as schema from "@/src/drizzle/schema"

// Check if Authentik is configured
export const authentikConfigured = !!(
  process.env.AUTHENTIK_CLIENT_ID &&
  process.env.AUTHENTIK_CLIENT_SECRET &&
  process.env.AUTHENTIK_URL
)

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
    // Conditionally add Authentik OAuth plugin
    ...(authentikConfigured
      ? [
          genericOAuth({
            config: [
              {
                providerId: "authentik",
                clientId: process.env.AUTHENTIK_CLIENT_ID!,
                clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
                discoveryUrl: `${process.env.AUTHENTIK_URL}/application/o/${process.env.AUTHENTIK_APP_SLUG || "msb-inventory"}/.well-known/openid-configuration`,
                scopes: ["openid", "profile", "email"],
                mapProfileToUser: (profile) => ({
                  name: profile.name || profile.preferred_username,
                  // Generate synthetic email if not provided by Authentik
                  // Uses sub (unique user ID) to ensure uniqueness
                  email: profile.email || `${profile.sub}@authentik.local`,
                  image: profile.picture,
                }),
                overrideUserInfo: true,
              },
            ],
          }),
        ]
      : []),
    // tanstackStartCookies MUST be last - required for TanStack Start cookie handling
    tanstackStartCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
