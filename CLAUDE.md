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