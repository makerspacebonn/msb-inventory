# Research: better-auth Library

> better-auth is the most comprehensive authentication framework for TypeScript.
> Latest version: 1.4.13

**Official Documentation:** https://www.better-auth.com/docs/introduction

---

## Installation

```bash
bun add better-auth
```

Required environment variables:
- `BETTER_AUTH_SECRET` - Min 32 chars, generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` - App base URL (e.g., `http://localhost:3000`)

---

## Database Schema

better-auth requires four core tables:

### Users Table
```typescript
export const UserTable = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: varchar("name"),
  email: varchar("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  image: varchar("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Admin plugin fields
  role: varchar("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: varchar("ban_reason"),
  banExpires: timestamp("ban_expires"),
})
```

### Sessions Table
```typescript
export const SessionTable = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => UserTable.id, { onDelete: "cascade" }),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  impersonatedBy: varchar("impersonated_by"),
})
```

### Accounts Table
```typescript
export const AccountTable = pgTable("accounts", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => UserTable.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").notNull(),
  providerId: varchar("provider_id").notNull(), // "authentik" or "credential"
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: varchar("scope"),
  idToken: text("id_token"),
  password: varchar("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

### Verifications Table
```typescript
export const VerificationTable = pgTable("verifications", {
  id: varchar("id").primaryKey(),
  identifier: varchar("identifier").notNull(),
  value: varchar("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

**Source:** https://www.better-auth.com/docs/adapters/drizzle

---

## Core Configuration

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

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
})
```

---

## Email/Password Auth

Enable in configuration:
```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  minPasswordLength: 8,
  maxPasswordLength: 128,
}
```

### Client-side Sign Up
```typescript
const { data, error } = await authClient.signUp.email({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
})
```

### Client-side Sign In
```typescript
const { data, error } = await authClient.signIn.email({
  email: "john@example.com",
  password: "password123",
  rememberMe: true,
})
```

**Source:** https://www.better-auth.com/docs/authentication/email-password

---

## Generic OAuth Plugin

For custom OAuth providers like Authentik:

```typescript
import { genericOAuth } from "better-auth/plugins"

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [{
        providerId: "authentik",
        clientId: process.env.AUTHENTIK_CLIENT_ID!,
        clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
        discoveryUrl: "https://auth.example.com/.well-known/openid-configuration",
        scopes: ["openid", "profile", "email", "groups"],
        mapProfileToUser: async (profile) => ({
          name: profile.name,
          email: profile.email,
          role: mapGroupsToRole(profile.groups),
        }),
        overrideUserInfo: true,
      }],
    }),
  ],
})
```

### Configuration Options
| Option | Description |
|--------|-------------|
| `providerId` | Unique identifier (e.g., "authentik") |
| `discoveryUrl` | OIDC discovery endpoint (auto-discovers other URLs) |
| `scopes` | OAuth scopes to request |
| `mapProfileToUser` | Transform provider profile to user object |
| `overrideUserInfo` | Update user data on each login |
| `disableSignUp` | Prevent new user registration |

### Client-side OAuth
```typescript
await authClient.signIn.oauth2({
  providerId: "authentik",
  callbackURL: "/",
})
```

**Source:** https://www.better-auth.com/docs/plugins/generic-oauth

---

## Admin Plugin (Roles)

```typescript
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
})
```

### Set User Role
```typescript
await authClient.admin.setRole({
  userId: "user-id",
  role: "editor",
})
```

### Check Permissions
```typescript
const canEdit = await authClient.admin.hasPermission({
  userId: "user-id",
  permissions: { items: ["edit"] },
})
```

**Source:** https://www.better-auth.com/docs/plugins/admin

---

## Email Verification

```typescript
emailVerification: {
  sendVerificationEmail: async ({ user, url, token }, request) => {
    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      text: `Click to verify: ${url}`,
    })
  },
},
emailAndPassword: {
  requireEmailVerification: true,
}
```

---

## Password Reset

```typescript
emailAndPassword: {
  sendResetPassword: async ({ user, url, token }, request) => {
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Click to reset: ${url}`,
    })
  },
}
```

### Client-side
```typescript
await authClient.requestPasswordReset({
  email: "john@example.com",
  redirectTo: "/reset-password",
})

await authClient.resetPassword({
  newPassword: "newpassword123",
  token,
})
```

**Source:** https://www.better-auth.com/docs/authentication/email-password
