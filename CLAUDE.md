# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MSB Inventory is a full-stack TypeScript inventory management system for Makerspace Bonn. It tracks items and locations (hierarchical) with image upload, AI-powered item description (Google Gemini), and login via better-auth with Kanidm (OIDC).

## Gate

Run the fast check first; run the full gate only once it is clean. Both must pass before "done" or a commit.

```bash
# Fast check (lint + format)
bunx biome check .

# Full gate
bun run typecheck && bun run test && bun run build && bun run test:e2e
```

Evidence: biome "No fixes applied", vitest and Playwright pass counts. E2E runs in Docker (`scripts/e2e-test.sh`); its report is in `e2e/playwright-report`.

## Development Commands
**Always use bun, not npm.** Use `bun run <script>` for `test` and `build`: `bun test` and `bun build` are Bun built-ins (Bun's test runner and bundler), not this project's scripts.

```bash
bun dev               # Start app + postgres in Docker with hot reload (http://localhost:3000)
bun dev:stop          # Stop Docker containers
bun dev:bg            # Restart dev server in background with logging (logs/dev.log)
bun dev:logs          # Tail the dev server log file
bun run test          # Unit tests once (vitest)
bun run test:e2e      # E2E tests (Playwright in Docker)
bun run typecheck     # tsc --noEmit
bun run build         # Production build
bun db:push --force   # Update the dev db to the Drizzle schema (non-interactive)
```

Requires Docker. Create `.env` from `.env_example` before running. More setup notes: [docs/Development.md](docs/Development.md).

## Architecture

**Runtime:** Bun with TanStack Start (React 19 + file-based routing). Library choices: [docs/stack.md](docs/stack.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md).

**Key Patterns:**

1. **Server Functions** - Type-safe RPC via `createServerFn()` from `@tanstack/react-start`
   ```typescript
   export const fetchItem = createServerFn()
     .validator((itemId: number) => itemId)
     .handler(async ({ data: itemId }) => {
       return new ItemRepository().findById(itemId)
     })
   ```

2. **Repository Pattern** - Data access layer in `/src/repositories/`
   - `ItemRepository` - Item CRUD
   - `LocationRepository` - Location hierarchy management

3. **File-based Routing** - Routes in `/src/routes/`, auto-generated to `routeTree.gen.ts`. API routes and `/api/auth/*`: see runtime traps.

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

**Image Handling:** Client-side compression (`browser-image-compression`) + cropping (`react-easy-crop`) before upload as base64.

## Runtime traps

Read [docs/runtime-traps.md](docs/runtime-traps.md) before touching these areas; add new traps there (dated, with library version), not here:
- **Server/client boundary:** server-only modules (`src/lib/auth.ts`, anything reading `process.env`) are imported dynamically inside a `createServerFn` handler, never statically in route files or components.
- **better-auth:** `tanstackStartCookies()` stays the last plugin; generic OAuth uses `signIn.social`; the callback URI is `/api/auth/callback/{providerId}`.
- **Request access:** `getRequest()` from `@tanstack/react-start/server`, not `getWebRequest()`.
- **E2E auth:** sessions are pre-seeded and the cookie is HMAC-signed with `BETTER_AUTH_SECRET`.

## Development Rules
- Use biome to check and autoformat the code
- E2E tests follow the guidelines in `e2e/README.md` (find elements by role/label, never let checks pass silently)
- Server functions that change data use `{ method: "POST" }`: the default is GET, which browsers and proxies may repeat on their own
- After changing `docs/Backlog.md`, run `bun run backlog:summary` to update `docs/BacklogSummary.md`; for a short backlog list, show that file
- Run `bun run security:scan` (Trivy on the production image, `bun audit` on all dependencies) after changing dependencies or the Dockerfile, and whenever the last entry in `docs/SecurityScans.md` is older than 30 days; report what it finds
- Server functions fail with `AppError` (`src/lib/errors.ts`); the client shows errors with `showError`/`errorMessage`, never a raw `error.message`
- Releases go through the `/release` command (`.claude/commands/release.md`); CI (`.github/workflows/main.yml`) builds and pushes the image to Docker Hub

## Commit Messages

Conventional commits: `type(scope): description`, imperative mood, first line under 72 characters, backlog ID (e.g. `UX-033`) in scope or subject.

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

- ONLY COMMIT WHEN REQUESTED BY THE USER OR AFTER ASKING FOR PERMISSION
- No Claude Code mentions, attribution, or "Generated with" footers

**Examples:** `feat(items): add image upload functionality`, `fix(locations): correct sorting order`, `chore(deps): update dependencies`
