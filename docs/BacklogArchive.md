# MSB Inventory Backlog Archive

Completed backlog items, moved from [Backlog.md](./Backlog.md).

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
- Callback URL: `/api/auth/callback/authentik` (must be whitelisted in Authentik)
- App slug configurable via `AUTHENTIK_APP_SLUG` env var (default: `msb-inventory`)

**Acceptance Criteria:**
- [x] Users can click "Mit Authentik anmelden"
- [x] OAuth flow redirects to Authentik and back
- [x] User is created/updated from Authentik profile

**E2E Verification:**
- Manual test with Authentik instance required
- E2E test verifies button is visible

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

## UX Improvements

User experience enhancements for common workflows.

### UX-001: Auto-select newly created location ✅ COMPLETED 2026-02-05
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
- [x] After creating a location, the new location is automatically selected/active
- [x] Location list updates to show the new location as current
- [x] Works for both top-level and nested location creation

**Implementation Notes:**
- Commit ec5a410: after creating a location, both `/locations` and the item location picker open the new location
- Kept by UX-005 (shared create-location flow)

---

### UX-002: Remember recent locations when adding items ✅ COMPLETED 2026-02-05
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

**Files Created:**
- `lib/recent-locations.ts` - localStorage utilities
- `src/hooks/useRecentLocations.ts` - SSR-safe React hook
- `components/location/RecentLocationsList.tsx` - Pill chip UI component

**Files Modified:**
- `components/location/LocationBrowser.tsx` - Added recent locations props
- `src/actions/locationActions.ts` - Added `fetchLocationById`
- `src/routes/items/$itemId/location/add.tsx` - Full integration

**Acceptance Criteria:**
- [x] Recent locations stored in localStorage after selection
- [x] Recent locations displayed below search field in item add form
- [x] Maximum 5 recent locations, most recent first
- [x] Clicking recent location selects it
- [x] Recent locations persist across sessions

---

### UX-003: Add item button in navigation bar ✅ COMPLETED 2026-02-05
**Priority:** Low
**Effort:** 0.25 day

**Description:**
Add a prominent "Item hinzufügen" button to the center of the main navigation bar for quick access to item creation from any page.

**Implementation Notes:**
- Added to `src/routes/__root.tsx`
- Uses three-column flex layout with `flex-1` on sides for true centering
- Button uses `variant="secondary"` for visual distinction
- Links to existing `/items/add` route

**Acceptance Criteria:**
- [x] Button visible in center of navigation bar
- [x] Button has plus icon and "Item hinzufügen" label
- [x] Button navigates to `/items/add`
- [x] Layout remains responsive on mobile

---

### UX-005: Consistent location selection experience ✅ COMPLETED 2026-11-01
**Priority:** High

**Description:**
Choosing a location (e.g. for an item) behaves inconsistently depending on where it happens. Every location selection should offer the same options on every location level.

**Desired Behavior:**
On every location the user can:
- Choose this location as the final location, which leads to the marker placement on the location image
- Add a new sublocation to this location
- Use a breadcrumb list to jump to a different location as entry point
- Select one of the existing sublocations

**Acceptance Criteria:**
- [x] All four options are available on every location level
- [x] The experience is identical everywhere a location is selected
- [x] Choosing the final location leads directly to marker placement

**Implementation Notes:**
- Every way of picking a location (tile, search, breadcrumb, recent chip) only opens it; "Hier ablegen" is the only way to choose
- Picker position lives in the URL (`/items/$itemId/location/add?at=<id>`), so back/reload work and the breadcrumb path is always loaded from the server (fixes wrong path after search)
- Current location is shown as a card with its image; tapping the image enlarges it with existing markers
- Marker step is skipped for locations without an image and shows existing markers faintly
- New sublocations open directly after creation; marker step only when the parent has an image
- Shared building blocks: `components/location/LocationMarkers.tsx`, `components/location/CurrentLocationCard.tsx`, `src/hooks/useCreateLocation.ts`, `fetchLocationView` in `locationActions.ts`
- `/locations` uses the same layout and shared code
- E2E: `e2e/tests/item-location-picker.spec.ts`

---

### AI-001: More relevant AI item descriptions and tags ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
The AI description from an item photo includes too much generic information. It should focus on information that helps find and identify the item. Tags should not contain general attributes like unimportant colors or the material an item is made of.

**Acceptance Criteria:**
- [x] AI-generated descriptions only contain relevant information
- [x] Tags no longer contain generic attributes (e.g. color, material) unless they distinguish the item
- [x] Tags help when searching for the item

**Implementation Notes:**
- Prompt and response format in `src/lib/aiItemPrompt.ts`; the 100 most used tags are passed in so the AI reuses existing spellings
- Gemini `responseSchema` enforces the reply format
- `src/lib/tagRules.ts` (stop list for colors, materials, generic words; spelling unification) filters AI tags and was used for the one-time cleanup of existing tags

---

### AI-002: Curated item categories ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Item categories have grown into an inconsistent list. Categories should be reduced to a meaningful set, e.g. a fixed list, with the option to add a new category when no existing one fits. The AI identification should pick from this list.

**Acceptance Criteria:**
- [x] A defined list of meaningful categories exists
- [x] Users choose a category from the list when adding/editing an item
- [x] A new category can be added when no existing one fits
- [x] AI identification suggests a category from the existing list
- [x] Existing items are mapped to the curated categories

**Implementation Notes:**
- `categories` table; `items.category` keeps the name (not an id) so the generated search columns keep working
- Category picker `components/form/CategoryCombobox.tsx`; saving an item with a new category adds it (case-insensitive reuse)
- AI picks from the list via enum, or proposes `kategorie_neu` when nothing fits
- One-time migration (16 curated categories + tag cleanup) via temporary admin page `/admin/migration`, see CLEANUP-001

---

### CLEANUP-001: Remove temporary category/tag migration ✅ COMPLETED 2026-11-02
**Priority:** Low
**Depends on:** AI-002 migration ran on production

**Description:**
The one-time migration for curated categories and tag cleanup is only needed until it ran on production. Afterwards its code should be removed.

**Acceptance Criteria:**
- [x] Migration ran on production (`/admin/migration` shows "bereits ausgeführt")
- [x] `src/dataMigration/` and `src/routes/admin/migration.tsx` are removed
- [x] `data_migrations` table is removed from the schema

**Implementation Notes:**
- The changelog keeps showing "Migration" as user for the migration's entries
