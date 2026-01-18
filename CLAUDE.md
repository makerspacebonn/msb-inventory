# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MSB Inventory is a full-stack TypeScript inventory management system for Makerspace Bonn. It tracks items, locations (hierarchical), and projects with features like image upload, AI-powered item description (via Google Gemini), and Discord OAuth.

## Development Commands
**Always use bun, not npm.**

```bash
bun dev          # Start app + postgres in Docker with hot reload (http://localhost:3000)
bun dev:stop     # Stop Docker containers
bun dev:tests    # Run tests in watch mode
bun test         # Run tests once
bun build        # Production build
bun db:push      # update the db to the expected drizzle format
bun dev:bg       # Restart dev server in background with logging (logs/dev.log)
bun dev:logs     # Tail the dev server log file
```

Requires Docker. Create `.env` from `.env_exampl   e` before running.

## Architecture

**Runtime:** Bun with TanStack Start (React 19 + file-based routing)

**Key Patterns:**

1. **Server Functions** - Type-safe RPC via `createServerFn()` from `@tanstack/react-start`
   ```typescript
   export const fetchItem = createServerFn()
     .inputValidator((itemId: number) => itemId)
     .handler(async ({ data: itemId }) => {
       return new ItemRepository().findById(itemId)
     })
   ```

2. **Repository Pattern** - Data access layer in `/src/repositories/`
   - `ItemRepository` - Item CRUD
   - `LocationRepository` - Location hierarchy management

3. **File-based Routing** - Routes in `/src/routes/`, auto-generated to `routeTree.gen.ts`

**Directory Structure:**
- `src/routes/` - TanStack Router pages
- `src/actions/` - Server functions (itemActions, locationActions, aiActions)
- `src/repositories/` - Database access layer
- `src/drizzle/` - Database schema and migrations
- `components/` - Shared React components (shadcn/ui based)
- `components/ui/` - Base UI primitives

**Database:** PostgreSQL with Drizzle ORM
- `ItemTable` - Inventory items with location references
- `LocationTable` - Hierarchical locations (self-referencing parentId)
- `UserTable` - better-auth users with role-based access control
- `SessionTable` - better-auth session management
- `AccountTable` - OAuth providers and credentials
- `VerificationTable` - Email verification and password reset tokens
- `ProjectsTable` - Project management

**Image Handling:** Client-side compression (`browser-image-compression`) + cropping (`react-easy-crop`) before upload as base64.

## Development Rules
**Rules:**
- use biome to chack and autoformat the code

**Commands:**
- ```bun dev``` starts the dev server.

## Commit Messages

Use conventional commits format: `type(scope): description`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

**Rules:**
- ONLY COMMIT, WHEN REQUESTED BY USER OR YOU HAVE ASKED FOR PERMISSION
- Use imperative mood ("add" not "added")
- Keep first line under 72 characters
- Scope is optional but recommended
- Do not include Claude Code mentions, attribution, or "Generated with" footers

**Examples:**
- `feat(items): add image upload functionality`
- `fix(locations): correct sorting order`
- `chore(deps): update dependencies`

## Session Learnings

### 2026-01-17 - better-auth Migration Setup
- **drizzle-kit push:** Use `bun db:push --force` for non-interactive schema updates (interactive prompts don't accept piped input)
- **better-auth schema:** Requires 4 tables - `users`, `sessions`, `accounts`, `verifications` with specific column names
- **Cascade deletes:** Sessions and accounts have FK to users with `ON DELETE CASCADE` - cleanup is automatic
- **Admin plugin fields:** Include `role`, `banned`, `banReason`, `banExpires` in users table for future RBAC (AUTH-005)

### 2026-01-17 - better-auth Implementation Patterns
- **API route pattern:** TanStack Start uses `createFileRoute` with `server.handlers` for API routes, NOT `createAPIFileRoute`. Export must be `Route`, not `APIRoute`
- **Catch-all auth route:** `src/routes/api/auth/$.ts` handles all `/api/auth/*` endpoints via `auth.handler(request)`
- **Client plugins:** When using `genericOAuth` on server, add `genericOAuthClient()` to client plugins for `signIn.oauth2()` method
- **Conditional plugins:** Check env vars and conditionally add plugins: `plugins: authentikConfigured ? [genericOAuth({...})] : []`
- **useSession hook:** better-auth's `useSession` returns `{ data: session, isPending, refetch }` - replaces all manual JWT/cookie logic
- **OIDC discovery:** `discoveryUrl` auto-configures authorization, token, and userinfo endpoints from `.well-known/openid-configuration`
- **E2E auth testing:** Use unique timestamped emails (e.g., `test-${Date.now()}@example.com`) to avoid conflicts between test runs

### 2026-01-17 - OAuth Configuration & Server Code Bundling
- **Server code in client:** Importing server-only code (like `auth.ts` with `process.env`) directly into client components causes "Buffer is not defined" errors. Use `createServerFn` with dynamic imports instead:
  ```typescript
  const getAuthConfig = createServerFn().handler(async () => {
    const { authentikConfigured } = await import("@/src/lib/auth")
    return { authentikConfigured }
  })
  ```
- **OAuth redirect URIs:** better-auth's `genericOAuth` plugin uses callback pattern `/api/auth/oauth2/callback/{providerId}`. This exact URI must be whitelisted in the OAuth provider (e.g., Authentik)
- **Configurable app slugs:** Use env vars like `AUTHENTIK_APP_SLUG` for provider-specific paths: `discoveryUrl: \`\${AUTHENTIK_URL}/application/o/\${AUTHENTIK_APP_SLUG}/.well-known/openid-configuration\``
- **Dev server logging:** Use `bun run dev:bg` to restart dev server in background with logging to `logs/dev.log`

### 2026-01-17 - TanStack Start Server/Client Boundary & Authorization
- **getRequest() not getWebRequest():** In TanStack Start v1.150+, the function is `getRequest()` from `@tanstack/react-start/server`, NOT `getWebRequest()`. Research docs may be outdated.
- **Dynamic imports in route files:** Route files are bundled for both server and client. Use dynamic `await import()` inside server function handlers for server-only modules:
  ```typescript
  const getAuthContext = createServerFn().handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server")
    const { auth } = await import("@/src/lib/auth")
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    return { isLoggedIn: !!session?.user, userId: session?.user?.id ?? null }
  })
  ```
- **tanstackStartCookies plugin:** Required for TanStack Start cookie handling - MUST be the LAST plugin in the array:
  ```typescript
  plugins: [
    ...(authentikConfigured ? [genericOAuth({...})] : []),
    tanstackStartCookies(), // MUST be last
  ]
  ```
- **Root route auth context:** Use `createRootRouteWithContext<RouterContext>()` with `beforeLoad` calling a server function to provide auth state to child routes
- **OAuth email workaround:** When OAuth provider doesn't return email, generate synthetic: `email: profile.email || \`\${profile.sub}@authentik.local\``

### 2026-01-17 - Post-Migration Cleanup
- **Schema migration side effects:** After migrating auth systems, audit codebase for references to removed schema fields. Example: `discordName` was removed from UserTable but `ChangelogRepository` still selected it, breaking the `/changelog` route.
- **Inline types vs schema types:** Inline type definitions like `{ name: string; discordName: string }` don't track schema changes. Consider deriving types from actual schema to catch mismatches at compile time.

### 2026-01-17 - E2E Testing with better-auth
- **Session tokens must be signed:** better-auth validates cookies using HMAC-SHA256. Token format: `{token}.{base64Signature}` signed with `BETTER_AUTH_SECRET`:
  ```typescript
  const signature = crypto.createHmac("sha256", BETTER_AUTH_SECRET).update(token).digest("base64")
  const signedToken = `${token}.${signature}`
  ```
- **Cookie settings for E2E:** Set `secure: false` for HTTP test environments, URL-encode the signed token value
- **Pre-seed sessions for fast auth:** Insert user + session in seed script (`scripts/seed-e2e-data.ts`), then set cookie in Playwright fixture - much faster than UI login
- **Port mapping for local debugging:** Add `ports: "3001:3000"` to `docker-compose.e2e.yml` to access app from host during debugging
- **Auth verification:** Check for user name in header (`text=${TEST_USER.name}`) instead of feature-specific buttons that may not exist on all pages
- **Test commands:** Use `bun run test` (Vitest) for unit tests, `bun run e2e` (Playwright) for E2E tests. Note: `bun test` uses Bun's native runner which conflicts with Playwright

### 2026-01-18 - Authentik OIDC Claims & Role Mapping
- **Authentik groups claim:** Use `user.ak_groups.all()` in Scope Mapping expressions to expose groups:
  ```python
  return {"groups": [group.name for group in user.ak_groups.all()]}
  ```
- **better-auth mapProfileToUser:** Receives full OIDC profile including custom claims. Use with `overrideUserInfo: true` to update user on each login
- **Session cache gotcha:** With `session.cookieCache.enabled: true`, role changes from OAuth may require 2 logins to take effect ([Issue #5772](https://github.com/better-auth/better-auth/issues/5772))
- **Account linking:** Enable with `account.accountLinking.enabled: true` and `trustedProviders: ["authentik"]` to link OAuth accounts to existing email users
- **Debugging OIDC claims:** Add `console.log(JSON.stringify(profile, null, 2))` in `mapProfileToUser` to see all claims from provider
- **Authentik avatars:** Standard `picture` claim in `profile` scope, or custom via `user.attributes.get("avatar")` in Property Mapping