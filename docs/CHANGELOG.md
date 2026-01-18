# Changelog

All notable changes to MSB Inventory will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-01-18

### Added
- Research documentation: `docs/research/authentik-better-auth-data-transfer.md` - comprehensive guide for passing roles and avatars from Authentik to better-auth
- OIDC profile logging in `mapProfileToUser` for debugging Authentik claims
- Account linking configuration for Authentik OAuth (`trustedProviders: ["authentik"]`)

### Technical
- Researched Authentik Scope Mappings with `user.ak_groups.all()` for group claims
- Documented better-auth `mapProfileToUser` custom claims handling
- Identified session cache limitation for role updates ([better-auth Issue #5772](https://github.com/better-auth/better-auth/issues/5772))

---

## 2026-01-17

### Added
- better-auth library (v1.4.14) for authentication
- Database tables for better-auth: `users`, `sessions`, `accounts`, `verifications`
- Admin plugin fields in users table for role-based access control
- Environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- Email/password authentication with registration and login
- Authentik OAuth integration via genericOAuth plugin
- "Mit Authentik anmelden" button on login page
- Comprehensive E2E tests for authentication flows
- `src/lib/auth.ts` - Server-side better-auth configuration
- `src/lib/auth-client.ts` - Client-side auth utilities with React hooks
- `src/routes/api/auth/$.ts` - Catch-all API route handler

### Changed
- Users table expanded with email, emailVerified, role, timestamps
- Updated `.env_example` with better-auth and Authentik configuration
- Login page now supports email/password with signup toggle
- AuthContext simplified to use better-auth's `useSession` hook
- `__root.tsx` gets user data from AuthContext instead of separate API call

### Removed
- Legacy JWT-based authentication (`createToken`, `verifyToken`)
- `src/routes/auth.callback.tsx` - better-auth handles OAuth callbacks
- Discord OAuth configuration from `.env_example`
- `JWT_SECRET` environment variable

### Fixed
- Authentik OAuth button conditional display (prevents server code bundling in client)
- OAuth callback URL pattern in `.env_example` (`/api/auth/oauth2/callback/authentik`)
- Made Authentik app slug configurable via `AUTHENTIK_APP_SLUG` env var

### Technical
- Completed AUTH-001: Install better-auth and configure database schema
- Completed AUTH-002: Implement better-auth core configuration
- Completed AUTH-003: Implement email/password authentication
- Completed AUTH-004: Implement Authentik OAuth integration
- Completed AUTH-007: Update middleware and context
- Completed AUTH-009: Cleanup legacy code

### Pending Configuration
- Authentik OAuth requires redirect URI configuration: `{BASE_URL}/api/auth/oauth2/callback/authentik`

## 2026-01-17 (Session 2)

### Added
- `tanstackStartCookies` plugin for proper TanStack Start cookie handling
- Root route auth context via `createRootRouteWithContext` for route-level auth guards
- `dev:bg` command to restart dev server in background with logging
- `dev:logs` command to tail the dev server log file
- Synthetic email generation for OAuth providers that don't return email

### Fixed
- **Critical:** `getWebRequest is not a function` error - API changed to `getRequest()` in TanStack Start v1.150+
- **Critical:** Server-only code bundled in client - use dynamic imports inside server function handlers
- **Security:** `removeItemLocation` now requires authentication via `authGuardMiddleware`
- **Security:** Backup download route now requires authentication
- **Security:** Location add route now has `beforeLoad` auth check
- **Security:** `authMiddleware` migrated from legacy JWT to better-auth session API

### Changed
- `src/middleware/authMiddleware.ts` - Uses better-auth `getRequest()` with dynamic imports
- `src/routes/__root.tsx` - Uses `createRootRouteWithContext` with server function for auth context
- `src/routes/backup.download.$.ts` - Dynamic import for auth module
- `src/lib/auth.ts` - Plugin array restructured with `tanstackStartCookies()` as last plugin

## 2026-01-17 (Session 3)

### Fixed
- **Critical:** `/changelog` route broken after better-auth migration - removed references to non-existent `discordName` field from `ChangelogRepository`, `ChangelogEntryWithUser` type, and `changelog.tsx`

### Changed
- `src/repositories/ChangelogRepository.ts` - User display now uses only `name` field
- `src/app/types.ts` - Simplified `ChangelogEntryWithUser.user` type
- `src/routes/changelog.tsx` - Removed unused imports, applied biome formatting

### Technical
- Added `/logs/*` to `.gitignore` for dev server log files

## 2026-01-17 (Session 4)

### Fixed
- **Critical:** E2E authentication with better-auth - session tokens must be HMAC-SHA256 signed
- **E2E:** Auth fixture now properly signs session tokens with `BETTER_AUTH_SECRET`
- **E2E:** Cookie `secure: false` for HTTP test environment
- **E2E:** Auth verification checks for user name in header instead of page-specific buttons

### Changed
- `e2e/fixtures/auth.fixture.ts` - Signs session token with HMAC-SHA256, sets proper cookie attributes
- `scripts/seed-e2e-data.ts` - Pre-seeds session for `e2e-user` for fast authentication
- `docker-compose.e2e.yml` - Added `BETTER_AUTH_SECRET` to app and playwright containers, added port mapping `3001:3000`

### Technical
- All 68 E2E tests pass with pre-seeded session authentication
- Reference: https://nelsonlai.dev/blog/e2e-testing-with-better-auth
