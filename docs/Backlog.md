# MSB Inventory Backlog

Open items. Completed items are moved to [BacklogArchive.md](./BacklogArchive.md).

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

### ARCH-006: Provider-neutral login naming
**Priority:** Low

**Description:**
Single sign-on is named after Kanidm throughout the app (settings, login route, callback URL, code). The login itself is standard OIDC, so the naming ties the app to one provider without need. Neutral naming would make it clear that any OIDC provider can be used, and make switching providers easier.

**Acceptance Criteria:**
- [ ] Settings, routes and code use provider-neutral names
- [ ] The provider's display name on the login button is configurable
- [ ] Existing deployments keep working, or the migration steps are documented
- [ ] Setup documentation describes the generic OIDC configuration

---

## UX Improvements

User experience enhancements for common workflows.

### UX-004: Larger item images in the item list
**Priority:** Medium

**Description:**
Item images in the item list are too small to recognize items at a glance. Images should be much bigger so users can identify items visually while scrolling.

**Acceptance Criteria:**
- [ ] Item images in the list are large enough to recognize the item without opening it
- [ ] Images stay sharp at the larger size
- [ ] The list remains usable on mobile and desktop

---

### LOC-001: Replace a location image while keeping markers
**Priority:** Medium

**Description:**
When a location's picture is replaced (e.g. after rearranging a shelf), all existing markers of sublocations and items on that image would no longer match. Users should be able to transfer the markers to the new image instead of placing all of them again.

**Desired Behavior:**
- All existing markers are shown on the old image
- The user defines a few reference points that correspond between the old and the new image
- The marker positions on the new image are calculated from these reference points
- A warning appears if not all markers can be placed on the new image
- The user can review the result before it's applied
- The change can be undone

**Acceptance Criteria:**
- [ ] Old markers are visible on the old image during replacement
- [ ] Reference points can be set on both images
- [ ] Markers are transferred to the new image automatically
- [ ] Markers that can't be placed are listed in a warning
- [ ] The user can check the result before saving
- [ ] The image replacement including marker changes can be undone

---

### UX-006: Choose location directly after adding an item
**Priority:** Medium

**Description:**
After adding a new item, the user lands on the item detail page and has to start the location selection separately. Choosing a location should follow directly as part of adding an item, so new items don't end up without a location.

**Acceptance Criteria:**
- [ ] After saving a new item, the location selection starts directly
- [ ] The user can skip choosing a location
- [ ] Editing an existing item does not force a location selection

---

### UX-007: Filter items without a location
**Priority:** Medium

**Description:**
Items without a location are hard to find in the inventory. The item list should offer a filter that shows only items without a location, so they can be located and sorted in.

**Acceptance Criteria:**
- [ ] The item list can be filtered to items without a location
- [ ] The filter can be combined with the search
- [ ] From the filtered list, a location can be assigned to an item easily

---

### UX-008: Search by clicking tags
**Priority:** Medium

**Description:**
Tags on items should be usable to find related items. Clicking a tag shows the search results for that tag; clicking further tags narrows the results to items that have all selected tags.

**Acceptance Criteria:**
- [ ] Tags are clickable wherever they are shown
- [ ] Clicking a tag opens the search with that tag as a filter
- [ ] Clicking more tags adds them to the filter; results contain only items with all selected tags
- [ ] Active tag filters are visible on the search page and can be removed one by one
- [ ] All tag filters can be removed at once

---

### UX-009: Search by photo
**Priority:** Medium

**Description:**
When holding an object, it's often faster to take a picture than to guess its name. Users should be able to search the inventory with a photo and get matching items, e.g. to find out whether an item already exists or where it belongs.

**Acceptance Criteria:**
- [ ] A search can be started with a photo taken or uploaded on the device
- [ ] Results show matching items, best matches first
- [ ] It's clear when no matching item was found
- [ ] Works on mobile

---

### UX-010: Filter items by photo
**Priority:** Low

**Description:**
Items without a photo are hard to recognize and should be completed over time. The item list should offer a filter for items with or without a photo.

**Acceptance Criteria:**
- [ ] The item list can be filtered to items with a photo and to items without a photo
- [ ] The filter can be combined with the search and other filters
- [ ] From the filtered list, a photo can be added to an item easily

---

### UX-011: Latest items on the front page
**Priority:** Medium

**Description:**
The front page shows statistics only. Showing the most recently added items lets users see what's new in the inventory and quickly get back to items they just added.

**Acceptance Criteria:**
- [ ] The front page shows the most recently added items, newest first
- [ ] Each entry leads to the item's page
- [ ] The list stays short and doesn't push the rest of the front page away

---

### UX-012: Open locations from an item's location path
**Priority:** Medium

**Description:**
An item's page shows the path of locations where it's stored, but the user can't go from there to one of these locations. Each location in the path should offer a way to open its location page, e.g. to see what else is stored there. Zooming into the location images stays as it is.

**Acceptance Criteria:**
- [ ] Every location in an item's location path can be opened as a location page
- [ ] Zooming into location images works as before
- [ ] It's clear which action opens the location and which one zooms

---

### PRINT-001: Choose the label printer
**Priority:** Low

**Description:**
The app already shows the status of every label printer, but labels are always sent to one fixed printer. With more than one printer in the space, users should be able to choose which printer prints their label.

**Acceptance Criteria:**
- [ ] When printing a label, the user can choose among the available printers
- [ ] Printers that are offline can't be chosen, or are clearly marked
- [ ] With only one printer, printing works without an extra step
- [ ] The last used printer is preselected

---

## Access Control

Who may do what in the inventory.

### ACCESS-001: Restrict administrative actions to admins
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

### TEST-001: Reliable E2E tests
**Priority:** Medium

**Description:**
Several E2E tests pass even when the feature they check is broken: they swallow failed assertions or skip their checks when an element isn't found. Others find elements by styling classes, so a visual change breaks them or makes them check the wrong element. Tests should fail when, and only when, the behavior they describe is broken.

**Acceptance Criteria:**
- [ ] No test passes when the element or behavior it checks is missing
- [ ] Tests find elements the way users do (role, label, visible text), or by dedicated test markers where that's not possible
- [ ] Changing styling alone doesn't break tests
- [ ] The approach is documented, so new tests follow it

---

## Operations

Backups, releases and running the app.

### OPS-001: Complete backups
**Priority:** High

**Description:**
A backup should contain everything needed to restore the inventory completely. Today it covers items, locations and images, but not the changelog and other data added since (e.g. categories), so a restore loses history and information.

**Acceptance Criteria:**
- [x] Backups include the changelog
- [x] Backups include all other data needed for a complete restore (e.g. categories)
- [x] A restore brings back the complete state of the backup
- [x] Older backups can still be restored

---

### OPS-002: New version with every deployment
**Priority:** Medium

**Description:**
Every deployment should get its own version number, shown in the app, so it's clear which state is running. The type of version change should follow from the changes since the last version (e.g. derived from conventional commits: fixes → patch, features → minor).

**Acceptance Criteria:**
- [ ] Every deployment has a new, unique version
- [ ] The running version is visible in the app
- [ ] The version change type is derived from the changes since the last version
- [ ] It's traceable which changes are in which version

---

### OPS-003: Remove projects
**Priority:** Low

**Description:**
The inventory is meant to manage items only. Leftovers of a former projects feature (database table, server routes) are still in the codebase, although nothing in the app uses them. They should be removed so the codebase only contains what the tool is for.

**Acceptance Criteria:**
- [ ] No project-related code, routes or data structures remain
- [ ] The projects table is removed from the database
- [ ] The app works as before
