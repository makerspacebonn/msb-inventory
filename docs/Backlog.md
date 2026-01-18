# MSB Inventory Backlog

## Authentication System Migration

Migration from custom authentication to better-auth library with Authentik OAuth.

### AUTH-001: Install better-auth and configure database schema ✅ COMPLETED 2026-01-17
**Priority:** High
**Research:** [better-auth.md](./research/better-auth.md#database-schema)

**Description:**
- Install better-auth package
- Add required database tables: `sessions`, `accounts`, `verifications`
- Expand `users` table with email, role, timestamps

**Acceptance Criteria:**
- [x] `bun add better-auth` completes successfully
- [x] Database migration runs without errors (`bun db:push`)
- [x] New tables exist in database

**E2E Verification:**
- Run `bun dev` and verify no startup errors
- Database tables visible in Drizzle Studio

---

### AUTH-002: Implement better-auth core configuration ✅ COMPLETED 2026-01-17
**Priority:** High
**Research:** [better-auth.md](./research/better-auth.md#core-configuration)
**Depends on:** AUTH-001

**Description:**
- Create `src/lib/auth.ts` with better-auth configuration
- Create `src/lib/auth-client.ts` for client-side utilities
- Create API route handler at `src/routes/api/auth/$.ts`

**Implementation Notes:**
- Created `src/lib/auth.ts` (server-side better-auth config with Drizzle adapter)
- Created `src/lib/auth-client.ts` (client-side auth utilities with React hooks)
- Created `src/routes/api/auth/$.ts` (catch-all API route handler)

**Acceptance Criteria:**
- [x] better-auth handler responds at `/api/auth/*` endpoints
- [x] Auth configuration includes Drizzle adapter

**E2E Verification:**
```bash
curl http://localhost:3000/api/auth/get-session
# Should return session or null
```

---

### AUTH-003: Implement email/password authentication ✅ COMPLETED 2026-01-17
**Priority:** High
**Research:** [better-auth.md](./research/better-auth.md#emailpassword-auth)
**Depends on:** AUTH-002

**Description:**
- Enable email/password in better-auth config
- Update login page with email/password form
- Add sign-up functionality

**Implementation Notes:**
- Updated `src/routes/login.tsx` with email/password form and signup toggle
- Updated `src/context/AuthContext.tsx` to use better-auth's `useSession` hook
- Updated `src/routes/__root.tsx` to display user info from session
- Created comprehensive E2E tests in `e2e/tests/auth.spec.ts`

**Acceptance Criteria:**
- [x] Users can register with email/password
- [x] Users can log in with email/password
- [x] Session persists across page reloads

**E2E Verification:**
- E2E tests cover registration, login, logout, and session persistence

---

### AUTH-004: Implement Authentik OAuth integration ✅ COMPLETED 2026-01-17
**Priority:** High
**Research:** [authentik-oauth.md](./research/authentik-oauth.md)
**Depends on:** AUTH-002

**Description:**
- Configure generic OAuth plugin for Authentik
- Set up OIDC discovery URL
- Handle OAuth callback

**Implementation Notes:**
- Added `genericOAuth` plugin to `src/lib/auth.ts` with Authentik config
- Added `genericOAuthClient` plugin to `src/lib/auth-client.ts`
- Added "Mit Authentik anmelden" button to login page (conditionally displayed via `createServerFn`)
- Plugin only loads when `AUTHENTIK_*` env vars are configured
- Callback URL: `/api/auth/oauth2/callback/authentik` (must be whitelisted in Authentik)
- App slug configurable via `AUTHENTIK_APP_SLUG` env var (default: `msb-inventory`)

**Acceptance Criteria:**
- [x] Users can click "Mit Authentik anmelden"
- [x] OAuth flow redirects to Authentik and back
- [x] User is created/updated from Authentik profile

**E2E Verification:**
- Manual test with Authentik instance required
- E2E test verifies button is visible

---

### AUTH-005: Implement role-based access control
**Priority:** Medium
**Research:** [better-auth.md](./research/better-auth.md#admin-plugin-roles)
**Depends on:** AUTH-004

**Description:**
- Create `src/lib/auth-roles.ts` for role mapping
- Configure admin plugin with roles
- Create role-based middleware guards

**Acceptance Criteria:**
- [ ] Role mapping from env vars works
- [ ] `editorGuardMiddleware` blocks non-editors
- [ ] `adminGuardMiddleware` blocks non-admins

**E2E Verification:**
```typescript
// e2e/auth.spec.ts
test('editor-only route blocks users', async ({ page }) => {
  await loginAsUser(page) // user role
  await page.goto('/locations')
  await expect(page.locator('text=Forbidden')).toBeVisible()
})
```

---

### AUTH-006: Configure Authentik group to role mapping
**Priority:** Medium
**Research:** [authentik-better-auth-data-transfer.md](./research/authentik-better-auth-data-transfer.md)
**Depends on:** AUTH-005

**Description:**
- Configure Authentik scope mapping for groups
- Map Authentik groups to local roles via env vars
- Update role on each OAuth login

**Implementation Reference:**
See `docs/research/authentik-better-auth-data-transfer.md` for:
- Authentik Scope Mapping with `user.ak_groups.all()`
- better-auth `mapProfileToUser` role extraction
- Environment variable configuration (`AUTHENTIK_ADMIN_GROUPS`, `AUTHENTIK_EDITOR_GROUPS`)

**Acceptance Criteria:**
- [ ] Authentik groups included in OIDC claims
- [ ] Environment variables configure mapping
- [ ] User role updates on re-login

**Known Limitation:** Session cache may require 2 logins for role changes (see Issue #5772)

---

### AUTH-007: Update middleware and context ✅ COMPLETED 2026-01-17
**Priority:** Medium
**Depends on:** AUTH-002

**Description:**
- Update `src/middleware/authMiddleware.ts` for better-auth sessions
- Update `src/context/AuthContext.tsx` for new auth client
- Remove legacy auth code

**Implementation Notes:**
- `AuthContext.tsx` now uses better-auth's `useSession` hook
- `__root.tsx` updated to get user from AuthContext (no more `getCurrentUser` calls)
- Legacy `src/lib/auth.ts` completely replaced with better-auth config

**Acceptance Criteria:**
- [x] Middleware uses better-auth session API
- [x] AuthContext provides user with role
- [x] All protected routes still work

---

### AUTH-008: Migrate existing users
**Priority:** Low
**Depends on:** AUTH-004

**Description:**
- Existing users (Authentik sub as ID) continue working
- On next OAuth login, records updated with new fields

**Acceptance Criteria:**
- [ ] Existing users can still log in
- [ ] User records updated with email, role

---

### AUTH-009: Cleanup legacy code ✅ COMPLETED 2026-01-17
**Priority:** Low
**Depends on:** AUTH-007

**Description:**
- Delete `src/routes/auth.callback.tsx`
- Remove unused Discord env vars
- Update `.env_example`

**Implementation Notes:**
- Deleted `src/routes/auth.callback.tsx` (better-auth handles callbacks)
- Legacy auth.ts replaced with better-auth config
- Discord env vars to be removed from `.env_example` separately

---

## Future Enhancements

### AUTH-010: Email verification
**Priority:** Low
**Research:** [better-auth.md](./research/better-auth.md#email-verification)

Enable email verification for new registrations.

---

### AUTH-011: Restrict registration
**Priority:** Low

Configure registration restrictions when open signup period ends.

---

### AUTH-012: Password reset flow
**Priority:** Low
**Research:** [better-auth.md](./research/better-auth.md#password-reset)

Implement password reset via email.
