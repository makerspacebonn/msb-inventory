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

### LOC-001: Replace a location image while keeping markers ✅ COMPLETED 2026-11-06
**Priority:** Medium

**Description:**
When a location's picture is replaced (e.g. after rearranging a shelf), all existing markers of sublocations and items on that image would no longer match. Users should be able to transfer the markers to the new image instead of placing all of them again.

**Desired Behavior:**
- All existing markers are shown on the old image
- The user defines a few reference points that correspond between the old and the new image
- The marker positions on the new image are calculated from these reference points
- A warning appears if not all markers can be placed on the new image
- The user can review the result before it's applied
- While placing or moving a marker on the new image, the old image stays visible with that marker highlighted, as a reference
- The reference points can be skipped when the location was rebuilt completely: markers then start at their old positions and are placed by hand
- Any logged-in user can replace an image
- The change can be undone

**Acceptance Criteria:**
- [x] Old markers are visible on the old image during replacement
- [x] Reference points can be set on both images
- [x] Markers are transferred to the new image automatically
- [x] Markers that can't be placed are listed in a warning
- [x] The user can check the result before saving
- [x] The old position of a marker is visible on the old image while placing it on the new one
- [x] Reference points can be skipped to place all markers by hand
- [x] The image replacement including marker changes can be undone

**Implementation Notes:**
- `/locations/$locationId/image` (`components/location/ReplaceImageSteps.tsx`): new photo, matching points, check. The location page links to it when the image has markers; otherwise the simple dialog stays
- `src/lib/markerTransform.ts`: an affine fit, or a perspective fit from 4 points when the points clearly need it and a real camera could produce it. Measured with ±1% tapping errors, 4 points near the corners stay within about 3% of the image, also for a photo from another angle; that's why the page asks for those
- Reference points only correct for the camera, so each marker can be moved afterwards (tap or drag); its old position stays highlighted on the old image, small and pinned on phones
- `replaceLocationImage` saves in one transaction and refuses when the markers changed in the meantime (`src/lib/markerUpdates.ts`); stored markers carry an extra `id`, so only `x` and `y` are compared
- Undo: changelog entries of one action share a `group_id`, one entry per record, and are undone together in a transaction (`undoEntries`); a newer change to any of them blocks it. Repositories accept a transaction for this. The changelog folds a group into one line (`src/lib/changelogGroups.ts`)
- `/api/e2e/group-changes` only works with `E2E_TEST_API=1`, set only in `docker-compose.e2e.yml`; `NODE_ENV` can't guard this, as the build fixes it to "production"
- E2E: `e2e/tests/location-image.spec.ts`, group undo in `changelog.spec.ts`

---

### UX-028: Backup page on phones ✅ COMPLETED 2026-11-06
**Priority:** Low

**Description:**
The backup page is hard to use on a phone: the list of backups and its actions don't fit the narrow screen. Admins should be able to create, download, restore and delete backups on a phone as easily as on a desktop.

**Acceptance Criteria:**
- [x] The backup list fits a phone screen without horizontal scrolling
- [x] All actions are easy to reach and tap on a phone
- [x] Name, date and size of each backup stay readable

**Implementation Notes:**
- Each backup stacks on phones: name and details on top, a row of 44 px buttons below; unchanged from `sm` up
- The long file name wraps anywhere (`break-all`, `min-w-0`) instead of widening the page
- The create button is full width on phones; the page's heading got the usual heading style
- Deleting a backup now asks for confirmation, as a mistaken tap can't be undone
- E2E: checks at 360 px that the page doesn't scroll sideways and all actions are at least 44 px

---

### UX-029: Activity statistics ✅ COMPLETED 2026-11-06
**Priority:** Low

**Description:**
The front page shows totals, but not how the inventory is used over time. Statistics per day for searches, additions, changes and deletions, shown as a graph, would show whether the inventory is kept up to date and how much it's used. A view per user could show who contributes.

**Acceptance Criteria:**
- [x] Searches, additions, changes and deletions are counted per day
- [x] A graph shows these numbers over a selectable period
- [x] Optionally the numbers can be shown per user
- [x] Searches are counted without storing what was searched for by whom

**Implementation Notes:**
- `/stats` (linked from the front page): totals, line charts "Suchen pro Tag" and "Änderungen pro Tag" (three lines, one scale), period 7/30/90 days in the URL; open to everyone, "Änderungen pro Person" only for logged-in users (the server leaves it out for visitors)
- Changes come from the changelog; searches are counted in the new table `search_counts` (one row per day, no text, no person): the results page (`searchInventory`) and photo search count, the header suggestions while typing don't
- Days are calendar days in Bonn (`src/lib/activityStats.ts`, unit-tested)
- `components/stats/LineChart.tsx`: plain SVG, no chart library; crosshair tooltip, keyboard as a slider (arrow keys, Home/End) with the day's values as `aria-valuetext`, legend for several lines, table view; line colors are the reference palette's first three dark slots, validated against the app's dark surface
- Also added: views per item (`item_views`, per item and day, removed with the item). A person's views of an item count once per hour (`src/lib/viewCounting.ts`): logged-in users by user id, visitors by a hash of IP address and browser with a daily changing salt, kept in memory only, so no cookie and no consent is needed; and "Meistgesehen (7 Tage)" with the five most viewed items on the front page
- Backups (format 3) include `search_counts` and `item_views`; restoring an older backup keeps the current search counts
- E2E: `e2e/tests/stats.spec.ts`, backup restore checks both new tables

---

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

---

### UX-004: Larger item images in the item list ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Item images in the item list are too small to recognize items at a glance. Images should be much bigger so users can identify items visually while scrolling.

**Acceptance Criteria:**
- [x] Item images in the list are large enough to recognize the item without opening it
- [x] Images stay sharp at the larger size
- [x] The list remains usable on mobile and desktop

**Implementation Notes:**
- Item list is a grid of square photo tiles (2 columns on phones, up to 6 on wide screens) with name and direct location below
- New medium image size (`?size=m`, 600px); tiles use `srcset` so the browser picks the smallest sharp image

---

### UX-012: Open locations from an item's location path ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
An item's page shows the path of locations where it's stored, but the user can't go from there to one of these locations. Each location in the path should offer a way to open its location page, e.g. to see what else is stored there. Zooming into the location images stays as it is.

**Acceptance Criteria:**
- [x] Every location in an item's location path can be opened as a location page
- [x] Zooming into location images works as before
- [x] It's clear which action opens the location and which one zooms

**Implementation Notes:**
- Each location in the path has a link to its location page below the photo; the photo itself only zooms and shows a zoom icon

---

### UX-013: Compact add-item button in the header ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
The add-item button takes up a lot of room in the header and is shown even to visitors who can't add items. It should be a compact icon and only appear for logged-in users.

**Acceptance Criteria:**
- [x] The add-item button in the header is shown as an icon only
- [x] The icon is still recognizable as "add item" (e.g. via label or tooltip)
- [x] Visitors who are not logged in don't see the button
- [x] Logged-in users can still add an item from every page

**Implementation Notes:**
- Icon-only link with label and tooltip "Item hinzufügen", next to the account on the right

---

### UX-014: Rarely used pages in a menu ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Admin and rarely used pages such as backup, changelog and printers compete for space in the header with everyday actions. They should always be reachable through a menu (hamburger icon) instead of being shown directly, so the header stays focused on common tasks.

**Acceptance Criteria:**
- [x] Backup, changelog, printers and other rarely used pages are reachable through a menu
- [x] These pages are no longer shown directly in the header, on any screen size
- [x] The menu only contains pages the current user is allowed to open
- [x] The menu works on mobile and desktop

**Implementation Notes:**
- Menu panel (dialog) behind the hamburger icon on every screen size: Drucker (logged in), Changelog, Backup (admins; wasn't linked anywhere before)
- On phones the menu also holds Items, Locations and the account

---

### UX-015: Search bar in the header with live results ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Searching is the most common way to find items, but it requires navigating to the search first. The header should always contain a search bar that shows results while typing. To make room, the version info moves from the logo to a footer.

**Acceptance Criteria:**
- [x] A search bar is visible in the header on every page
- [x] Results appear while typing, without submitting the search
- [x] Selecting a result opens it directly
- [x] The full search results can still be opened from the search bar
- [x] The search bar is usable on mobile
- [x] The logo no longer shows version info
- [x] The version info is shown in a footer on every page

**Implementation Notes:**
- Search fills the space between the main pages and the actions; shows up to 6 items with photo and location while typing
- Enter or "Alle Ergebnisse anzeigen" opens `/items?q=…`
- Version shown in a footer on every page

---

### UX-019: Search by category ✅ COMPLETED 2026-11-02
**Priority:** High

**Description:**
Categories should be usable to find related items. Clicking an item's category shows all items in that category as search results. The same search can be typed in the search field as `cat:"category name"`, and with a wildcard (e.g. `cat:"Elektro*"`) it finds items in all matching categories. Clicking a category comes first; the typed syntax builds on it.

**Acceptance Criteria:**
- [x] Categories are clickable wherever they are shown
- [x] Clicking a category shows the search results for that category
- [x] `cat:"category name"` in the search field finds the items of that category, ignoring case
- [x] `cat:"some*"` finds the items of all categories matching the pattern
- [x] A category search can be combined with free search text
- [x] It's visible in the search that a category filter is active

**Implementation Notes:**
- The category on the item page links to the search with `cat:"Name"` prefilled, so clicking and typing use the same path
- Query parsing is a pure, unit-tested function (`src/lib/searchQuery.ts`); several `cat:` filters mean "any of them", since an item has one category
- `*` becomes an `ILIKE` wildcard; `%`, `_` and `\` in a pattern match literally
- Category-only searches list all matching items alphabetically; with text, the text ranking and the 100-result limit apply
- Active category filters show as chips on the results page, each removable while keeping the rest of the query

---

### UX-008: Search by clicking tags ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Tags on items should be usable to find related items. Clicking a tag shows the search results for that tag; clicking further tags narrows the results to items that have all selected tags.

**Acceptance Criteria:**
- [x] Tags are clickable wherever they are shown
- [x] Clicking a tag opens the search with that tag as a filter
- [x] Clicking more tags adds them to the filter; results contain only items with all selected tags
- [x] Active tag filters are visible on the search page and can be removed one by one
- [x] All tag filters can be removed at once

**Implementation Notes:**
- Tags on the item page link to the search with `tag:"Name"`; the search syntax is shared with categories (UX-019), including `*` wildcards
- Several tag filters must all match (unlike categories, where any may match)
- Further tags are clicked in an "Eingrenzen" row on the results page: the most frequent tags among the results, without the active ones and without tags every result already has
- Active tag filters show as chips, each removable; "Alle Schlagwort-Filter entfernen" appears from two tag filters on and keeps category filters and search text

---

### UX-009: Search by photo ✅ COMPLETED 2026-11-03
**Priority:** Medium

**Description:**
When holding an object, it's often faster to take a picture than to guess its name. Users should be able to search the inventory with a photo and get matching items, e.g. to find out whether an item already exists or where it belongs.

**Acceptance Criteria:**
- [x] A search can be started with a photo taken or uploaded on the device
- [x] Results show matching items, best matches first
- [x] It's clear when no matching item was found
- [x] Works on mobile

**Implementation Notes:**
- Camera button in the header (logged-in users only, as each search is an AI call) opens `/items/photo`: take a photo or choose one
- The AI describes the photo with the same prompt and vocabulary as the item form; items sharing words, name, category or tags are ranked best first (`src/lib/photoMatch.ts`)
- Tested on 20 inventory photos, each searched with its own photo: 13 found at position 1, 17 within the first five
- E2E tests use a fixed AI answer (`GEMINI_STUB_RESPONSE` in `docker-compose.e2e.yml`)

---

### UX-021: Sticky header ✅ COMPLETED 2026-11-04
**Priority:** Low

**Description:**
On long pages (search results, item lists, the changelog) the header with search and menu scrolls out of view. It should stay visible at the top, so search and navigation are always at hand.

**Acceptance Criteria:**
- [x] The header stays at the top of the screen while scrolling
- [x] It doesn't cover page content, dialogs or menus
- [x] It takes little vertical space on phones

**Implementation Notes:**
- `sticky top-0` header with a solid background in `src/routes/__root.tsx`; no backdrop blur, as a filter would pin the mobile search results (position: fixed) to the header
- E2E: `e2e/tests/header.spec.ts` ("Header: sticky")

---

### UX-022: Fresher statistics on the front page ✅ COMPLETED 2026-11-04
**Priority:** Low

**Description:**
The statistics on the front page are up to a day old, so newly added items don't show up in the numbers for a long time. They should be at most an hour old.

**Acceptance Criteria:**
- [x] The front page statistics are at most one hour old
- [x] The front page loads as fast as before

**Implementation Notes:**
- Cache time of the in-memory statistics cache in `src/actions/statsActions.ts` lowered from 24 hours to 1 hour

---

### UX-023: Remove the front page subtitle ✅ COMPLETED 2026-11-04
**Priority:** Low

**Description:**
The welcome line below the front page heading adds nothing the heading doesn't already say. Removing it makes the front page cleaner.

**Acceptance Criteria:**
- [x] The front page shows no subtitle below the heading
- [x] The layout of the front page still looks balanced

**Implementation Notes:**
- Welcome line removed from `src/routes/index.tsx`; the heading keeps the spacing to the statistics

---

### UX-024: Add tags with an overlay on phones ✅ COMPLETED 2026-11-05
**Priority:** Medium

**Description:**
Creating and choosing tags is cumbersome on a phone. Adding a tag should open a full-screen overlay: the input sits at the top of the screen, matching existing tags are suggested below it, and one tap or Enter adds the tag and closes the overlay.

**Acceptance Criteria:**
- [x] A "+" button next to the tags opens the overlay
- [x] The input is at the top of the screen and focused, so the keyboard doesn't cover it
- [x] While typing, matching existing tags are suggested below the input
- [x] Tapping a suggestion adds that tag and closes the overlay
- [x] Pressing Enter adds the typed text as a new tag and closes the overlay
- [x] The close button (X) closes the overlay without changing the tags
- [x] Tags that are already on the item aren't suggested again

**Implementation Notes:**
- `components/form/TagPicker.tsx` replaces the `emblor` tag input (dependency removed) on all screen sizes: full screen on phones, a dialog near the top on larger screens
- Suggestions from `fetchAutocompleteTags`, most used first; only the latest request's answer is shown
- Rules in `src/lib/tagInput.ts`: a known tag typed in another case keeps its existing spelling, duplicates are ignored
- Combobox pattern: arrow keys select a suggestion, Enter accepts it (or the typed text when nothing is selected)
- Accepting the AI's tags adds them to the entered ones (`addTags`); the AI suggestion only lists tags the item doesn't have yet
- E2E: `e2e/tests/tag-picker.spec.ts`

---

### UX-025: Better use of screen space when choosing a location ✅ COMPLETED 2026-11-05
**Priority:** Medium

**Description:**
On a phone, choosing a location wastes much of the screen: the title, the item, the search, recent locations, the breadcrumb and the current location take up most of the first screen, so the sublocations, which are what people actually pick from, only start at the bottom edge. Choosing a location should need less scrolling.

**Acceptance Criteria:**
- [x] On a phone, the sublocations start within the first screen
- [x] Sublocations keep their large photos, as they make places easy to recognize
- [x] It stays clear which item is being placed and where in the hierarchy the user is
- [x] Placing the item at the current location stays reachable without scrolling
- [x] Creating a new sublocation is offered next to placing the item here, not as a tile among the sublocations
- [x] The locations page offers creating a sublocation in the same place, so both pages behave alike
- [x] Search and recent locations remain available
- [x] Recent locations can also be removed on touch screens

**Implementation Notes:**
- Measured on a 390 × 844 phone with three recent locations: the first sublocation row starts at 480 px instead of about 690 px and is fully visible
- One compact top row (back, item, heading) on the picker and the move dialog; no doubled side padding
- Breadcrumb (parents only) inside `CurrentLocationCard`; `LocationBrowser` hands it to `renderHeader`
- `NewLocationButton` next to "Hier ablegen", below the card on `/locations`, next to the heading at the top level; the "+" tile is gone
- Recent locations in one sideways scrolling row with an always visible X
- E2E: `e2e/tests/item-location-picker.spec.ts`

---

### PRINT-002: Print location labels ✅ COMPLETED 2026-11-04
**Priority:** Medium

**Description:**
Labels can only be printed for items. Shelves, boxes and drawers need labels too, so people can find locations in the space and open them in the app from the label.

**Acceptance Criteria:**
- [x] A label can be printed from a location's page
- [x] The label shows the location's name and a code that opens its page in the app
- [x] Printing works the same way as for item labels
- [x] Only logged-in users can print labels

**Implementation Notes:**
- "Etikett drucken" on the location page sends `{link, name, id}` via MQTT like item labels; the printed id is "Ort N", the link the short URL `/l/N` (redirects to `/locations?id=N`)
- Shared QR code/label component `components/QRCodeLabel.tsx` for items and locations
- E2E: `e2e/tests/location-label.spec.ts`

---

### PRINT-003: Print label sheets as PDF ✅ COMPLETED 2026-11-04
**Priority:** Medium

**Description:**
Labelling a whole shelf one label at a time is slow. Users should be able to print many labels at once on standard label sheets (e.g. HERMA 4265): choose the sheet type, the first free label on a partly used sheet, and the items and locations to label, and get a printable PDF. Sheet types differ a lot in label size and in the number of rows and columns, so the labels adapt to the size: the QR code matters most, then the name, then the path for locations.

**Acceptance Criteria:**
- [x] The sheet type can be chosen from a list; HERMA 4265 is available to start with
- [x] The first free label is chosen on a grid matching the chosen sheet type
- [x] Items and locations can be selected on the print page
- [x] Items and locations can also be collected while browsing, with the add buttons only shown while a print job is being put together
- [x] The selection can be cleared
- [x] Each label shows a QR code that opens the item or location; name and (for locations) path are added as space allows
- [x] The result is a PDF that prints the labels onto the sheet positions
- [x] After printing, the next free label is suggested for the next print
- [x] Only logged-in users can print label sheets

**Implementation Notes:**
- Page `/labels` (`src/routes/labels.tsx`); PDF built in the browser with jsPDF and a vector QR code (`src/lib/labelPdf.ts`), loaded on demand
- Sheet templates and label layout in `src/lib/labelSheets.ts`: HERMA 4265, HERMA 5029 and Niceday 980467; QR code 45 % of the shorter label side (20–50 mm), name across the full width, path shortened from the front
- Print list in `src/context/LabelSheetContext.tsx` (localStorage); add buttons in `components/labels/LabelSheetButtons.tsx` only show while collecting
- Test page with numbered frames and label 1 marked "OBEN", plus an offset for printer correction
- E2E: `e2e/tests/label-sheet.spec.ts`

---

### UX-026: Link items and locations in the changelog ✅ COMPLETED 2026-11-07
**Priority:** Medium

**Description:**
The changelog names the items and locations that were changed, but they can't be opened from there. Users who see a change often want to look at the item or location right away, for example to check where something was moved.

**Acceptance Criteria:**
- [x] Items and locations in changelog entries link to their page
- [x] Entries of deleted items or locations show the name without a broken link
- [x] Links work for all kinds of changes (created, edited, moved, deleted)

**Implementation Notes:**
- Each summary row ends with an icon that opens the item or location page, next to the toggle button rather than inside it
- The changelog reports per entry whether the item or location still exists (`entityExists`); deleted ones get no icon

---


### UX-030: Most viewed items page ✅ COMPLETED 2026-11-07
**Priority:** Low

**Description:**
The home page shows only a few of the most viewed items from the last 7 days. A longer list and other periods would show which items members are interested in over time, for example to decide what deserves a better place or a second copy.

**Acceptance Criteria:**
- [x] The home page shows the 10 most viewed items
- [x] A dedicated page lists the most viewed items, reachable from the home page
- [x] The page can switch between the last 7 days, the last 30 days and all time

**Implementation Notes:**
- New page `/most-viewed?period=7|30|all` lists up to 50 items; the front page shows 10 and links to it with "Alle anzeigen"
- `fetchMostViewedItems` takes the period and whether it's the front page preview; `viewPeriodStart` gives no start day for all time
- Front page and page share `components/stats/MostViewedList.tsx`

---


### UX-011: Latest items on the front page ❌ DROPPED 2026-11-07
**Priority:** Medium

**Description:**
The front page shows statistics only. Showing the most recently added items lets users see what's new in the inventory and quickly get back to items they just added.

**Acceptance Criteria:**
- [ ] The front page shows the most recently added items, newest first
- [ ] Each entry leads to the item's page
- [ ] The list stays short and doesn't push the rest of the front page away

**Reason:**
Not needed: the items list already shows the newest items first, so it covers what's new and items just added.

---

### AI-003: Suggest new categories ✅ COMPLETED 2026-11-07
**Priority:** Low

**Description:**
Items can only be put into the curated categories. When the AI recognizes an item that fits none of them well, it should be able to suggest a new category, which the user accepts or rejects, so the category list grows with the inventory without becoming cluttered.

**Acceptance Criteria:**
- [x] When no existing category fits, the AI can suggest a new one
- [x] A suggested category is clearly marked as new
- [x] The user can accept the suggestion, which adds the category, or reject it
- [x] Rejected suggestions don't create a category
- [x] Only authorized users can add categories this way

**Implementation Notes:**
- Already built with AI-001/AI-002: the AI returns `kategorie_neu` when no category fits, and a "new" one matching an existing category (ignoring case) is mapped back to it
- The item form shows it as "Neue Kategorie: …" with use and dismiss; saving the item creates it via `CategoryRepository.ensure`
- Categories are only created by saving an item, which requires a login

---

### UX-027: Several pictures per item ✅ COMPLETED 2026-11-07
**Priority:** Medium

**Description:**
An item has only one picture, but many items need more than one view to be recognized or described well, e.g. the front and the type plate. Users should be able to add several pictures, and the AI analysis should use all of them, so it can read details that a single picture doesn't show.

**Acceptance Criteria:**
- [x] An item can have several pictures, and one of them is the main picture shown in lists
- [x] Pictures can be added, removed and reordered when adding or editing an item
- [x] The AI analysis uses all pictures of the item
- [x] Existing items keep their picture as the main picture

**Implementation Notes:**
- `imagePath` stays the main picture, so lists, search and labels are unchanged; further pictures are in the new column `extraImagePaths` (default empty, so existing items and older backups need nothing)
- At most 6 pictures, each cropped square with the same dialog (`components/form/CropDialog.tsx`, also used by `MyCropper`)
- The form sends all pictures in order (`{ path }` kept, `{ upload }` new); `resolvePictures` (`src/lib/itemPictures.ts`) stores the new ones and refuses files that aren't the item's own
- The item page shows the main picture with thumbnails below to switch; the AI analysis gets all pictures in one request, with the prompt saying they show the same item
- Removed pictures' files stay on disk, so an undo can bring them back (see OPS-004)

---

### LOC-002: Precise marker placement ✅ COMPLETED 2026-11-07
**Priority:** Medium

**Description:**
Markers are hard to place exactly, especially on a phone, where the finger covers the spot it is placing. This matters most when replacing a location image, where the reference points decide where all markers end up, but it affects every marker placement. An enlarged view of the area under the finger while holding and moving it would make placing precise. The details need to be discussed.

**Acceptance Criteria:**
- [x] While placing a marker, the spot under the finger can be seen enlarged
- [x] The marker can be moved around before it is set
- [x] Works for all marker placements, including the reference points when replacing an image
- [x] Works on a phone and with a mouse
- [x] Open details are agreed on before implementation

**Implementation Notes:**
- Agreed: a loupe on press for touch and mouse, above the finger and beside it near the top of the screen (never below); a fixed corner may be tried later, only `loupePlacement` in `src/lib/loupe.ts` would change
- `PlacementSurface` handles the press: the mouse starts the loupe at once; a finger after holding still for 150 ms, so a quick swipe still scrolls; a quick tap or click places directly
- While the loupe shows, a non-passive `touchmove` listener stops the page from scrolling
- The loupe shows the image at 3× with a fine, translucent cross; dragging markers when replacing an image shows it too
- Positions are kept to 0.1% (`roundPercent`), for new placements and carried-over markers; existing whole-number markers stay as they are

---

### UX-006: Choose location directly after adding an item ✅ COMPLETED 2026-11-07
**Priority:** Medium

**Description:**
After adding a new item, the user lands on the item detail page and has to start the location selection separately. Choosing a location should follow directly as part of adding an item, so new items don't end up without a location.

**Acceptance Criteria:**
- [x] After filling in a new item, the location selection starts directly (before saving, see notes)
- [x] The user can skip choosing a location
- [x] Editing an existing item does not force a location selection

**Implementation Notes:**
- Changed on purpose: the location is chosen before the item is saved, so a new item is one "Erstellt" entry in the changelog with its location and marker, not a creation followed by a change
- A new item's form has "Weiter zum Ort" (also on Enter) and "Ohne Ort erstellen"; the picker offers "Ohne Ort speichern" and goes back to the form with everything kept
- The picker is now `components/location/ItemLocationPicker.tsx`, used by the form (browsing kept in state) and by `/items/$itemId/location/add` (browsing kept in the URL)
- `saveItem` takes `locationId` and `parentLocationMarker` and refuses a location that doesn't exist

---

## Access Control

Who may do what in the inventory.

### ACCESS-001: Restrict administrative actions to admins ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Every logged-in user can currently do everything, including actions that are hard to undo or affect the whole inventory. Users get an admin role via Kanidm (`KANIDM_ADMIN_GROUP`), but the app doesn't check it. Administrative actions should only be available to admins; everyday work (adding and editing items and locations) stays open to all logged-in users.

**Decision (2026-11-02):**
- Admin-only: backups (page, list, create, download, restore, delete) and undoing changes in the changelog
- Open to all logged-in users: deleting items and locations, the printer status page

**Acceptance Criteria:**
- [x] It's decided and documented which actions are admin-only
- [x] Non-admins can't run these actions, also not by calling the server directly
- [x] Non-admins don't see controls for actions they can't run
- [x] Admins can do everything as before

---

## Testing

Confidence that the tests catch real problems.

### TEST-001: Reliable E2E tests ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Several E2E tests pass even when the feature they check is broken: they swallow failed assertions or skip their checks when an element isn't found. Others find elements by styling classes, so a visual change breaks them or makes them check the wrong element. Tests should fail when, and only when, the behavior they describe is broken.

**Acceptance Criteria:**
- [x] No test passes when the element or behavior it checks is missing
- [x] Tests find elements the way users do (role, label, visible text), or by dedicated test markers where that's not possible
- [x] Changing styling alone doesn't break tests
- [x] The approach is documented, so new tests follow it

**Implementation Notes:**
- Icon-only buttons and form fields got accessible names, so tests (and screen readers) find them by role and label
- Guidelines for new tests: `e2e/README.md`

---

## Operations

### OPS-003: Remove projects ✅ COMPLETED 2026-11-06
**Priority:** Low

**Description:**
The inventory is meant to manage items only. Leftovers of a former projects feature were still in the codebase, although nothing in the app used them. They should be removed so the codebase only contains what the tool is for.

**Acceptance Criteria:**
- [x] No project-related code, routes or data structures remain
- [x] The projects table is removed from the database
- [x] The app works as before

**Implementation Notes:**
- Only the table, its types, the backup exclusion and doc mentions were left; the routes were already gone. Old migration files stay as history
- The table is dropped by `db:push --force` in `run.sh` on the next deployment; it isn't in backups, so check production first: `SELECT count(*) FROM projects;`

---

### OPS-005: Backups created several times ✅ COMPLETED 2026-11-06
**Priority:** High

**Description:**
Creating a backup on a phone produced several backups within seconds instead of one. Duplicate backups take up space and make it unclear which one to restore. One request to create a backup should always result in exactly one backup.

**Acceptance Criteria:**
- [x] Creating a backup on a phone results in exactly one backup
- [x] Tapping the button again while a backup is being created doesn't start another one
- [x] The cause is understood, and other actions with the same problem are fixed too

**Implementation Notes:**
- Likely cause (found in the code, not reproduced on a phone): `generateBackup` used the server function default GET, which browsers and proxies may repeat on their own, e.g. when a connection drops during a long request
- `generateBackup`, `deleteBackup`, `restoreBackup` and `setItemLocation` now use POST; the unused `refreshInventoryStats` was removed
- `shareWhileRunning`: a second request while a backup is being created gets the same backup
- `src/actions/serverFnMethods.test.ts` fails when a server function that doesn't plainly read uses GET

---

Backups, releases and running the app.

### OPS-001: Complete backups ✅ COMPLETED 2026-11-02
**Priority:** High

**Description:**
A backup should contain everything needed to restore the inventory completely. Today it covers items, locations and images, but not the changelog and other data added since (e.g. categories), so a restore loses history and information.

**Acceptance Criteria:**
- [x] Backups include the changelog
- [x] Backups include all other data needed for a complete restore (e.g. categories)
- [x] A restore brings back the complete state of the backup
- [x] Older backups can still be restored

---

### OPS-006: Small image updates ❌ DROPPED 2026-11-07
**Priority:** Medium

**Description:**
Every new version of the Docker image has to be downloaded by the server. When only a little code changed, the update should be small too, so deployments are fast and don't download the same unchanged parts again and again.

**Acceptance Criteria:**
- [ ] A change to the app's code only changes a small part of the image
- [ ] Parts that rarely change, like the base image and dependencies, are reused between versions
- [ ] The size of a typical update is known before and after the change

**Reason:**
Not needed for now: deployments mostly use `build.sh`, where a code-only update is already small.

**Findings (2026-11-07):**
- Image 444 MB (uncompressed): base image ~115 MB, production dependencies ~325 MB, app code (`dist`) ~3 MB
- `build.sh` builds with the local build cache: after a code change only 3.2 MB of layers changed, so push and pull stay small
- Still large: every `bun.lock` change rebuilds the whole dependency layer; so does a lost local build cache. CI builds (version tags) run without a cache, so every layer after the base image changes each time
- The dependency layer is large because `@tanstack/react-start` brings its build tools (vite, rolldown, babel, prettier, lightningcss) into production; bundling the server's packages into `dist` would shrink it
- If needed later: bundle the server's packages, and enable the registry build cache in `.github/workflows/main.yml`

---


## Architecture Improvements

### ARCH-002: Standardize error handling ✅ COMPLETED 2026-11-05
**Priority:** Medium

**Description:**
Server functions failed with plain errors ("Unauthorized"), and the client could only show their text. Failures should have a consistent structure with a code, so the client can react to the kind of failure.

**Acceptance Criteria:**
- [x] `src/lib/errors.ts` created with `AppError` class
- [x] `authMiddleware.ts` uses `AppError` instead of plain strings
- [x] Error responses include consistent `{ code, message, statusCode }` format
- [x] Client-side error handling updated to use error codes

**Implementation Notes:**
- `AppError(code, message)` with the codes `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_INPUT`, `NOT_CONFIGURED`, `AI_RATE_LIMITED`, `AI_UNAVAILABLE`, `AI_FAILED`; the status follows from the code
- TanStack Start only keeps an error's message across the server function boundary; a serialization adapter in `src/start.ts` keeps the class and code
- `requireLogin`/`requireAdmin` in `src/lib/access.ts` are shared by the middleware and the routes' `beforeLoad`
- Client: `errorMessage(error, fallback)` shows an AppError's message and hides other errors' (possibly technical) text; `showError` adds an "Anmelden" button for `UNAUTHORIZED`; the router's error page (`components/ErrorPage.tsx`) offers the login when that's what's missing
- Fixed: saving an item after the session ran out failed silently; now a toast asks to log in again and the form keeps its values (E2E in `item-crud.spec.ts`)
- Expected outcomes stay results (`{ success: false, error }`, e.g. undo blocked by a newer change); AppError is for requests that can't be served
- The HTTP status of the response isn't set from `statusCode` (server functions still answer 500); nothing relies on it so far

---

### ARCH-003: Extract generic undo handler ✅ COMPLETED 2026-11-05
**Priority:** High

**Description:**
Undoing an item change and undoing a location change were two nearly identical functions in `changelogActions.ts`. They should share one handler, so a new kind of entity only describes how it is stored.

**Acceptance Criteria:**
- [x] One generic undo handler
- [x] Both items and locations use it
- [x] Conflict detection logic preserved
- [x] Existing undo E2E tests pass

**Implementation Notes:**
- `undoEntityChange` in `src/lib/undoEntityChange.ts` (instead of `changelogUtils.ts`, which holds change detection): undo create → delete, update → write back the changed fields, delete → restore with the old id; each undo is logged as a change of its own
- Each entity kind is an `UndoStore` in `changelogActions.ts` (`undoStores`): `findById`, `delete`, `update`, `restore`, and optional `prepareRestore` (items drop generated search fields and `updatedAt`, and turn `createdAt` back into a date)
- No database imports in the handler: unit tests with an in-memory store (6 tests)
- The conflict check stays in `undoChange` before the handler is called
- New E2E tests that really undo: an item edit, an item creation and a location deletion (before, the tests only opened and cancelled the dialog)

---

### ARCH-004: Move server logic from route files to actions ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
Extract business logic from route files into dedicated action files, so route files only handle UI and server logic can be tested in isolation.

**Acceptance Criteria:**
- [x] `addItem` moved to `itemActions.ts`
- [x] Route file only handles UI and calls action functions
- [x] No direct repository instantiation in route files
- [x] Existing functionality preserved

**Implementation Notes:**
- `addItem` became `saveItem`; `fetchItemWithLocation` and `removeItemLocation` moved out of `i.$itemId.tsx`
- The item schema is shared between form and server (`src/lib/itemSchema.ts`)
- Pure helpers `diffFields` and `parseImageDataUrl` in `src/lib/itemChanges.ts` with unit tests
- Server-only routes (`api/items`, `img/$`) still use repositories directly, as they are HTTP handlers, not UI routes

---

### ARCH-001: Extract shared image utilities ✅ COMPLETED 2026-11-02
**Priority:** High

**Description:**
Image upload handling was duplicated in the item and location actions. It should live in one shared place.

**Acceptance Criteria:**
- [x] `src/lib/imageUtils.ts` created with shared functions
- [x] All files refactored to use shared utility
- [x] Unit tests for image utilities
- [x] No functional changes to image upload behavior

**Implementation Notes:**
- `parseImageDataUrl`, `storeImage` and `deleteImage`; tests run against a temporary `SAVE_PATH`
- Intended change: location images now also go through the jpeg/png/webp/gif allowlist and are written before the location is saved, like item images

---

### ARCH-005: Consolidate changelog recording ✅ COMPLETED 2026-11-02
**Priority:** Medium

**Description:**
The changelog recording pattern was repeated in every item, location and undo action. It should be one reusable helper.

**Acceptance Criteria:**
- [x] `recordChange` helper created
- [x] `detectChangedFields` utility extracted
- [x] All 4+ duplication sites refactored
- [x] Changelog E2E tests pass

**Implementation Notes:**
- `recordChange` lives next to `ChangelogRepository` and takes typed entity snapshots, so the callers need no casts (13 sites)
- Change detection is `diffFields`/`isSameValue` in `src/lib/changelogUtils.ts`, kept free of database imports so it is unit-testable
