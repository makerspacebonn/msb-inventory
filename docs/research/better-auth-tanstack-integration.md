# Research: better-auth + TanStack Router/Start Integration

> A comprehensive guide to integrating better-auth with TanStack Start, including Authentik OAuth provider considerations.

**Official Documentation:**
- better-auth: https://www.better-auth.com/docs/integrations/tanstack
- TanStack Start: https://tanstack.com/start/latest/docs/framework/react/guide/authentication
- Authentik: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Handler Setup](#handler-setup)
3. [Cookie Handling](#cookie-handling)
4. [Session Management](#session-management)
5. [Middleware Patterns](#middleware-patterns)
6. [Authentik OAuth Configuration](#authentik-oauth-configuration)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Best Practices](#best-practices)

---

## Architecture Overview

The integration between better-auth and TanStack Start involves three main components:

| Component | Location | Purpose |
|-----------|----------|---------|
| Server Auth | `src/lib/auth.ts` | Central better-auth instance with plugins |
| Client Auth | `src/lib/auth-client.ts` | React hooks and sign-in methods |
| API Route | `src/routes/api/auth/$.ts` | Catch-all route for auth endpoints |

### Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Client      │────▶│ /api/auth/*      │────▶│ better-auth │
│ (React)     │     │ (catch-all route)│     │ handler     │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                                            │
       │                                            ▼
       │                                     ┌─────────────┐
       │                                     │ Database    │
       │                                     │ (Drizzle)   │
       │                                     └─────────────┘
       │
       ▼
┌─────────────┐
│ authClient  │
│ (hooks)     │
└─────────────┘
```

**Source:** https://www.better-auth.com/docs/integrations/tanstack

---

## Handler Setup

### API Route Pattern

TanStack Start uses file-based routing. The catch-all auth route must use `createFileRoute` (NOT `createAPIFileRoute`):

```typescript
// src/routes/api/auth/$.ts
import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/src/lib/auth"

export const Route = createFileRoute("/api/auth/$")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => auth.handler(request),
      POST: async ({ request }) => auth.handler(request),
    },
  },
})
```

**Critical Notes:**
- Export must be named `Route`, not `APIRoute`
- The `$` segment captures all paths under `/api/auth/`
- Both GET and POST delegate to `auth.handler(request)`

**Source:** https://www.better-auth.com/docs/integrations/tanstack

---

## Cookie Handling

### The tanstackStartCookies Plugin

better-auth requires the `tanstackStartCookies` plugin for proper cookie operations in TanStack Start:

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { tanstackStartCookies } from "better-auth/tanstack-start"

export const auth = betterAuth({
  // ... other config
  plugins: [
    // Other plugins first
    genericOAuth({ ... }),
    admin({ ... }),
    // tanstackStartCookies MUST be last
    tanstackStartCookies(),
  ],
})
```

**Critical Notes:**
- This plugin MUST be the last plugin in the array
- For Solid.js: use `"better-auth/tanstack-start/solid"` instead
- Without this plugin, cookies won't be set correctly

### Secure Cookies in Production

The plugin uses `BETTER_AUTH_URL` to determine if it should use secure cookies:

```typescript
// Better to be explicit in production
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [tanstackStartCookies()],
})
```

**Source:** https://github.com/better-auth/better-auth/issues/3128

---

## Session Management

### Client-Side Session Hook

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [genericOAuthClient()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
```

### Using useSession

The `useSession` hook returns a reactive session state:

```typescript
function Component() {
  const { data: session, isPending, refetch } = useSession()

  if (isPending) return <Loading />
  if (!session) return <LoginButton />

  return <UserProfile user={session.user} />
}
```

**Return Values:**
| Property | Type | Description |
|----------|------|-------------|
| `data` | `Session \| null` | Current session with user |
| `isPending` | `boolean` | Loading state |
| `refetch` | `() => Promise<void>` | Manually refresh session |

### Server-Side Session Check

```typescript
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "@/src/lib/auth"

export const getAuthContext = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })

  return {
    isLoggedIn: !!session?.user,
    userId: session?.user?.id ?? null,
    user: session?.user ?? null,
  }
})
```

**Important:** Use `createServerFn` with dynamic imports when accessing auth from client components to avoid bundling server code:

```typescript
// WRONG - causes "Buffer is not defined" error
import { auth } from "@/src/lib/auth"

// CORRECT - dynamic import in server function
const getAuthConfig = createServerFn().handler(async () => {
  const { authentikConfigured } = await import("@/src/lib/auth")
  return { authentikConfigured }
})
```

**Source:** https://dev.to/hirotoshioi/how-to-protect-server-functions-with-auth-middleware-in-tanstack-start-opj

---

## Middleware Patterns

### Request Middleware (Informational)

Extracts session data without blocking requests:

```typescript
// src/middleware/authMiddleware.ts
import { createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "@/src/lib/auth"

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
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
  }
)
```

### Guard Middleware (Protective)

Blocks unauthorized access with redirect:

```typescript
import { redirect } from "@tanstack/react-router"

export const authGuardMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      throw redirect({ to: "/login" })
      // Or throw new Error("Unauthorized")
    }

    return next({
      context: {
        userId: session.user.id,
        user: session.user,
      },
    })
  }
)
```

### Applying Middleware to Server Functions

```typescript
export const createItem = createServerFn()
  .middleware([authGuardMiddleware])
  .inputValidator(/* ... */)
  .handler(async ({ data, context }) => {
    // context.userId is available and type-safe
    console.log(`User ${context.userId} creating item`)
    // ...
  })
```

### Route-Level Protection with beforeLoad

```typescript
// src/routes/admin.tsx
import { createFileRoute, redirect } from "@tanstack/react-router"
import { getAuthContext } from "@/src/actions/authActions"

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const auth = await getAuthContext()
    if (!auth.isLoggedIn) {
      throw redirect({ to: "/login" })
    }
    if (auth.user?.role !== "admin") {
      throw redirect({ to: "/" })
    }
    return { auth }
  },
  component: AdminPage,
})
```

**Source:** https://tanstack.com/router/v1/docs/framework/react/guide/authenticated-routes

---

## Authentik OAuth Configuration

### Server-Side Setup

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

const AUTHENTIK_URL = process.env.AUTHENTIK_URL
const AUTHENTIK_APP_SLUG = process.env.AUTHENTIK_APP_SLUG || "msb-inventory"
const AUTHENTIK_CLIENT_ID = process.env.AUTHENTIK_CLIENT_ID
const AUTHENTIK_CLIENT_SECRET = process.env.AUTHENTIK_CLIENT_SECRET

export const authentikConfigured = !!(
  AUTHENTIK_URL &&
  AUTHENTIK_CLIENT_ID &&
  AUTHENTIK_CLIENT_SECRET
)

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  plugins: [
    ...(authentikConfigured
      ? [
          genericOAuth({
            config: [
              {
                providerId: "authentik",
                clientId: AUTHENTIK_CLIENT_ID!,
                clientSecret: AUTHENTIK_CLIENT_SECRET!,
                discoveryUrl: `${AUTHENTIK_URL}/application/o/${AUTHENTIK_APP_SLUG}/.well-known/openid-configuration`,
                scopes: ["openid", "profile", "email"],

                // Optional: Custom profile mapping
                mapProfileToUser: async (profile) => ({
                  name: profile.name || profile.preferred_username,
                  email: profile.email || `${profile.sub}@authentik.local`,
                  image: profile.picture,
                }),

                // Optional: Update user data on each login
                overrideUserInfo: true,
              },
            ],
          }),
        ]
      : []),
    tanstackStartCookies(), // MUST be last
  ],
})
```

### Client-Side Setup

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [genericOAuthClient()], // Required for OAuth2 sign-in
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
```

### Triggering OAuth Sign-In

```typescript
// In your login component
const handleAuthentikLogin = async () => {
  await signIn.oauth2({
    providerId: "authentik",
    callbackURL: "/",
    errorCallbackURL: "/login?error=oauth",
  })
}
```

### Authentik Provider Configuration

In Authentik Admin, configure the OAuth2/OIDC provider:

| Setting | Value |
|---------|-------|
| **Client Type** | Confidential |
| **Redirect URIs** | `{BASE_URL}/api/auth/oauth2/callback/authentik` |
| **Scopes** | `openid`, `profile`, `email` (and optionally `groups`) |
| **Include claims in ID token** | Enabled (recommended) |

### OIDC Discovery URL Format

```
https://{AUTHENTIK_URL}/application/o/{APP_SLUG}/.well-known/openid-configuration
```

This auto-discovers:
- Authorization endpoint
- Token endpoint
- UserInfo endpoint
- JWKS URI

### Group Claims for RBAC

To include user groups in the OIDC token:

1. **Create Scope Mapping in Authentik:**
   - Navigate to Customization > Property Mappings
   - Create new Scope Mapping:
     - Name: `groups`
     - Scope: `groups`
     - Expression:
       ```python
       return {
           "groups": [group.name for group in request.user.ak_groups.all()]
       }
       ```

2. **Add to Provider:**
   - Edit OAuth2 provider
   - Add `groups` scope mapping

3. **Map in better-auth:**
   ```typescript
   mapProfileToUser: async (profile) => ({
     name: profile.name,
     email: profile.email,
     role: mapGroupsToRole(profile.groups || []),
   }),
   ```

**Source:** https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/

---

## Common Issues & Solutions

### 1. "Buffer is not defined" Error

**Cause:** Importing server-only code (like `auth.ts`) directly into client components.

**Solution:** Use `createServerFn` with dynamic imports:
```typescript
// WRONG
import { auth } from "@/src/lib/auth"

// CORRECT
const getAuthConfig = createServerFn().handler(async () => {
  const { authentikConfigured } = await import("@/src/lib/auth")
  return { authentikConfigured }
})
```

**Source:** Session learnings from CLAUDE.md

### 2. Cookies Not Set After Sign-In

**Cause:** Missing `tanstackStartCookies` plugin or incorrect plugin order.

**Solution:**
```typescript
plugins: [
  // Other plugins first
  tanstackStartCookies(), // MUST be last
]
```

**Source:** https://github.com/better-auth/better-auth/issues/5639

### 3. Session Not Persisting on Hard Reload

**Cause:** Server-side session check not forwarding cookies properly.

**Solution:** Use server functions that access the original request:
```typescript
const getSession = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  return session
})
```

**Source:** https://github.com/better-auth/better-auth/issues/4389

### 4. Secure Cookies Not Working in Production

**Cause:** `BETTER_AUTH_URL` not set or incorrect.

**Solution:**
```typescript
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, // Must be set
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
})
```

**Source:** https://github.com/better-auth/better-auth/issues/3128

### 5. Safari Cookie Issues

**Cause:** Safari handles cookies differently, especially with SameSite settings.

**Solution:**
```typescript
advanced: {
  cookies: {
    session_token: {
      sameSite: "lax", // More compatible than "strict"
    },
  },
},
```

**Source:** https://github.com/TanStack/router/issues/3492

### 6. OAuth Callback URL Mismatch

**Cause:** Redirect URI in Authentik doesn't match better-auth's expected pattern.

**Solution:** Use the exact pattern:
```
{BETTER_AUTH_URL}/api/auth/oauth2/callback/{providerId}
```

For Authentik:
```
https://your-app.com/api/auth/oauth2/callback/authentik
```

### 7. Cross-Subdomain Authentication

**Cause:** Server-to-server requests don't include browser cookies.

**Solution:** Forward cookies from the original request:
```typescript
const fetchSessionFromSubdomain = createServerFn().handler(async () => {
  const request = getRequest()
  const response = await fetch("https://api.domain.com/auth/session", {
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  })
  return response.json()
})
```

**Source:** https://dev.to/simonxabris/ssr-authentication-across-subdomains-using-tanstack-start-and-better-auth-21hg

---

## Best Practices

### 1. Use Client SDK for Authentication

better-auth recommends using the client SDK rather than calling `auth.api` directly in server actions:

```typescript
// Recommended - using authClient
await authClient.signIn.email({ email, password })

// Not recommended - calling auth.api from server action
await auth.api.signInEmail({ body: { email, password } })
```

### 2. Environment Variable Structure

```bash
# Required
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Authentik OAuth (optional)
AUTHENTIK_URL=https://auth.example.com
AUTHENTIK_APP_SLUG=msb-inventory
AUTHENTIK_CLIENT_ID=
AUTHENTIK_CLIENT_SECRET=

# Role Mapping (optional)
AUTHENTIK_ADMIN_GROUPS=admins,super-admins
AUTHENTIK_EDITOR_GROUPS=editors,content-managers
```

### 3. Conditional Plugin Loading

Only load plugins when properly configured:

```typescript
plugins: [
  ...(authentikConfigured ? [genericOAuth({ ... })] : []),
  ...(adminEnabled ? [admin({ ... })] : []),
  tanstackStartCookies(), // Always last
]
```

### 4. Post-Login Navigation Pattern

```typescript
const handleLogin = async () => {
  const result = await signIn.email({ email, password })
  if (result.error) {
    setError(result.error.message)
    return
  }

  await refetch()           // Update useSession hook
  await router.invalidate() // Invalidate route loaders
  await navigate({ to: "/" })
}
```

### 5. E2E Testing with Unique Emails

Use timestamped emails to avoid conflicts:

```typescript
const testEmail = `test-${Date.now()}@example.com`
await signUp.email({ email: testEmail, password: "test123", name: "Test" })
```

### 6. Router Context for Global Auth State

```typescript
// src/routes/__root.tsx
export const Route = createFileRoute("/__root")({
  beforeLoad: async () => {
    const auth = await getAuthContext()
    return { auth }
  },
  component: RootLayout,
})

// Access in any child route
function ChildRoute() {
  const { auth } = Route.useRouteContext()
  // auth.isLoggedIn, auth.userId, auth.user available
}
```

---

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Plugin Order** | `tanstackStartCookies` must be last |
| **Session Access** | Use `useSession` hook on client, `auth.api.getSession` on server |
| **Protected Routes** | Use middleware for server functions, `beforeLoad` for routes |
| **OAuth Provider** | Use `genericOAuth` plugin with OIDC discovery |
| **Authentik Callback** | `{BASE_URL}/api/auth/oauth2/callback/authentik` |
| **Server Code Isolation** | Never import `auth.ts` directly in client components |
| **Cookie Security** | Explicitly set `BETTER_AUTH_URL` and `useSecureCookies` |

---

## References

- [better-auth TanStack Integration](https://www.better-auth.com/docs/integrations/tanstack)
- [better-auth Generic OAuth Plugin](https://www.better-auth.com/docs/plugins/generic-oauth)
- [TanStack Router Authentication Guide](https://tanstack.com/router/v1/docs/framework/react/guide/authenticated-routes)
- [TanStack Start Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [Authentik OAuth2 Provider](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/)
- [Authentik Property Mappings](https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/)
- [better-auth TanStack Starter Template](https://github.com/daveyplate/better-auth-tanstack-starter)