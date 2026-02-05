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

---

## Architecture Improvements

Code consolidation and structural improvements identified via architectural review (2026-01-19).

### ARCH-001: Extract shared image utilities
**Priority:** High
**Effort:** 1 day

**Description:**
Extract duplicated image handling code into `src/lib/imageUtils.ts`.

**Current Duplication:**
- `src/routes/items/add.tsx` - `decodeBase64Image()` function
- `src/routes/locations.tsx` - `decodeBase64Image()` function
- `src/actions/locationActions.ts` - `decodeBase64Image()` function (lines 49-58)

**Implementation:**
```typescript
// src/lib/imageUtils.ts
export function decodeBase64Image(base64: string): { buffer: Buffer; mimeType: string }
export function saveImage(buffer: Buffer, filename: string, directory: string): Promise<string>
export function deleteImage(path: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] `src/lib/imageUtils.ts` created with shared functions
- [ ] All 3 files refactored to use shared utility
- [ ] Unit tests for image utilities
- [ ] No functional changes to image upload behavior

---

### ARCH-002: Standardize error handling
**Priority:** Medium
**Effort:** 1 day

**Description:**
Create consistent error handling with structured `AppError` class.

**Current Issues:**
- `aiActions.ts` has excellent granular error handling (lines 62-115)
- `authGuardMiddleware` throws plain strings: `throw new Error("Unauthorized")`
- No standardized error response format across server functions

**Implementation:**
```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message)
  }
}

// Usage
throw new AppError('UNAUTHORIZED', 'Authentication required', 401)
throw new AppError('VALIDATION_ERROR', 'Invalid item ID', 400, { field: 'itemId' })
```

**Acceptance Criteria:**
- [ ] `src/lib/errors.ts` created with `AppError` class
- [ ] `authMiddleware.ts` uses `AppError` instead of plain strings
- [ ] Error responses include consistent `{ code, message, statusCode }` format
- [ ] Client-side error handling updated to use error codes

---

### ARCH-003: Extract generic undo handler
**Priority:** High
**Effort:** 1-2 days

**Description:**
Consolidate near-identical `undoItemChange` and `undoLocationChange` functions into a generic handler.

**Current Duplication:**
- `src/actions/changelogActions.ts` lines 107-209: `undoItemChange()` (~100 lines)
- `src/actions/changelogActions.ts` lines 211-305: `undoLocationChange()` (~100 lines)
- Functions are 90% identical, differing only in repository and field handling

**Implementation:**
```typescript
// src/lib/changelogUtils.ts
interface EntityRestorer<T> {
  repository: { restore: (data: T) => Promise<T>; delete: (id: number) => Promise<void> }
  excludeFields: string[]
  entityType: 'item' | 'location'
}

export async function undoEntityChange<T>(
  changelogEntry: ChangelogEntry,
  restorer: EntityRestorer<T>,
  context: AuthContext
): Promise<UndoResult>
```

**Acceptance Criteria:**
- [ ] `src/lib/changelogUtils.ts` created with generic undo handler
- [ ] Both `undoItemChange` and `undoLocationChange` use shared handler
- [ ] Conflict detection logic preserved
- [ ] Existing undo E2E tests pass

---

### ARCH-004: Move server logic from route files to actions
**Priority:** Medium
**Effort:** 2-3 days

**Description:**
Extract business logic from route files into dedicated action files.

**Current Issues:**
- `src/routes/items/add.tsx` contains ~80 lines of server logic including:
  - `addItem` server function with direct repository calls
  - File I/O operations
  - Changelog creation
- Violates single responsibility principle
- Harder to test in isolation

**Implementation:**
1. Move `addItem` logic to `src/actions/itemActions.ts`
2. Keep route file focused on UI rendering and loader/action wiring
3. Apply same pattern to any other routes with embedded server logic

**Acceptance Criteria:**
- [ ] `addItem` moved to `itemActions.ts`
- [ ] Route file only handles UI and calls action functions
- [ ] No direct repository instantiation in route files
- [ ] Existing functionality preserved

---

### ARCH-005: Consolidate changelog recording
**Priority:** Medium
**Effort:** 1 day

**Description:**
Extract repeated changelog recording pattern into reusable helper.

**Current Duplication (4+ locations):**
- `src/actions/itemActions.ts` lines 67-76, 100-109
- `src/actions/locationActions.ts` lines 91-101, 180-188, 212-220

**Pattern:**
```typescript
await new ChangelogRepository().create({
  entityType: "item" | "location",
  entityId: id,
  changeType: "create" | "update" | "delete",
  userId: context.userId,
  beforeValues: ...,
  afterValues: ...,
  changedFields: [...]
})
```

**Implementation:**
```typescript
// src/lib/changelogUtils.ts
export async function recordChange(params: {
  entityType: 'item' | 'location'
  entityId: number
  changeType: 'create' | 'update' | 'delete'
  userId: string | null
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}): Promise<void>

export function detectChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[]
```

**Acceptance Criteria:**
- [ ] `recordChange` helper created in `changelogUtils.ts`
- [ ] `detectChangedFields` utility extracted
- [ ] All 4+ duplication sites refactored
- [ ] Changelog E2E tests pass

---

## UX Improvements

User experience enhancements for common workflows.

### UX-001: Auto-select newly created location
**Priority:** Medium
**Effort:** 0.5 day

**Description:**
After creating a new location, automatically set it as the active/selected location instead of staying on the previous location or requiring manual navigation.

**Current Behavior:**
- User creates a new location
- User must manually navigate to or select the newly created location

**Desired Behavior:**
- After successful location creation, the new location becomes the active one
- User can immediately see and work with the new location

**Acceptance Criteria:**
- [ ] After creating a location, the new location is automatically selected/active
- [ ] Location list updates to show the new location as current
- [ ] Works for both top-level and nested location creation

---

### UX-002: Remember recent locations when adding items
**Priority:** Medium
**Effort:** 0.5 day

**Description:**
When adding an item, remember the last 5 selected locations in localStorage and display them as quick-select options below the location search field.

**Current Behavior:**
- User must search for a location every time they add an item
- No memory of frequently or recently used locations

**Desired Behavior:**
- After selecting a location when adding an item, store it in localStorage (max 5, most recent first)
- Display recent locations as clickable chips/buttons below the location search field
- Clicking a recent location immediately selects it

**Implementation Notes:**
- Store in localStorage key: `msb-inventory:recent-locations`
- Format: `[{ id: number, name: string, path: string }]` (path for display context)
- Update list on location selection (move to front if exists, add to front if new, trim to 5)
- Clear individual recent locations if they no longer exist in database

**Acceptance Criteria:**
- [ ] Recent locations stored in localStorage after selection
- [ ] Recent locations displayed below search field in item add form
- [ ] Maximum 5 recent locations, most recent first
- [ ] Clicking recent location selects it
- [ ] Recent locations persist across sessions
