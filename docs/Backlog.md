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

### UX-016: Report an item as missing
**Priority:** Medium

**Description:**
Users regularly go to an item's location and find it isn't there. Today there's no way to tell the inventory, so the next person runs into the same problem. An item should have a "Nicht da" button so the wrong location becomes visible and can be fixed.

**Acceptance Criteria:**
- [ ] An item can be reported as not found at its location with one click
- [ ] The item's page shows that it was reported missing, and when
- [ ] Items reported missing can be listed, so someone can look for them
- [ ] The report goes away when the item gets a location again or someone confirms it's back

---

### UX-017: Report an item as used up
**Priority:** Medium

**Description:**
Consumables (glue, filament, screws, …) run out, and nobody notices until the next person needs them. An item should have a "Leer" button so users can report it as used up and it can be refilled or reordered.

**Acceptance Criteria:**
- [ ] An item can be reported as used up with one click
- [ ] The item's page shows that it's used up, and when it was reported
- [ ] Used-up items can be listed, e.g. as a shopping list
- [ ] The report can be removed once the item is refilled

---

### UX-018: Group identical items in the search
**Priority:** Low

**Description:**
Some things exist several times, e.g. five identical sewing machines. Each one should keep its own item (and label), but a search shouldn't list five identical entries. Identical items should appear once in the search, with a way to see the individual items of the group.

**Acceptance Criteria:**
- [ ] Identical items can be marked as belonging together
- [ ] A search shows a group of identical items as one entry, with the number of items
- [ ] From that entry, the individual items and their locations can be opened
- [ ] Each item in a group keeps its own page and label

**Open Questions:**
- What makes items "identical": set by hand, or detected (e.g. same name, manufacturer and model)?
- Is the group its own page with shared photo and description, or just a view on the items?
- Where else should groups appear besides the search (item list, location pages)?

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

### PRINT-002: Print location labels
**Priority:** Medium

**Description:**
Labels can only be printed for items. Shelves, boxes and drawers need labels too, so people can find locations in the space and open them in the app from the label.

**Acceptance Criteria:**
- [ ] A label can be printed from a location's page
- [ ] The label shows the location's name and a code that opens its page in the app
- [ ] Printing works the same way as for item labels
- [ ] Only logged-in users can print labels

---

## Lending

Borrowing items from the space.

### LEND-001: Lend out items
**Priority:** Low

**Description:**
Members borrow things from the space, but nobody knows who has what or when it comes back. Items should be lendable: users record that they borrowed an item and until when, and both users and admins keep track of what's lent out, with reminders when a return is due.

**Acceptance Criteria:**
- [ ] A logged-in user can record that they borrowed an item, with a planned return date
- [ ] An item's page shows that it's lent out, to whom, and until when
- [ ] Users see an overview of the items they borrowed
- [ ] Admins see an overview of all lent items, with overdue ones highlighted
- [ ] Users and admins are reminded when a return is due or overdue
- [ ] Returning an item ends the lending

**Open Questions:**
- Which items may be lent out at all, and does lending need an admin's approval?
- How are reminders sent (email, Discord, a display in the space via MQTT, …)?
- Should past lendings stay visible as history?

---

## Operations

Backups, releases and running the app.

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
