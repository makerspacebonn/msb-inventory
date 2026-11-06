# MSB Inventory Backlog

Open items. Completed items are moved to [BacklogArchive.md](./BacklogArchive.md).

## Architecture Improvements

Code consolidation and structural improvements identified via architectural review (2026-01-19).

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

### ARCH-007: Single level of abstraction
**Priority:** Low

**Description:**
Some functions and components mix high-level steps with low-level details, for example a route that describes a workflow and also builds queries or formats data. Code where each function works on a single level of abstraction reads like a description of what happens, and the details sit in well-named helpers. The codebase should be reviewed against this principle and the places where it helps most improved.

**Acceptance Criteria:**
- [ ] The places that mix levels of abstraction the most are identified
- [ ] These places read as a sequence of named steps, with the details in helpers
- [ ] The app works as before
- [ ] The principle is documented in the development rules, so new code follows it

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

### UX-020: Suggest possible duplicates when adding an item
**Priority:** Medium

**Description:**
Items are sometimes added twice because nobody knows one already exists. When adding a new item, similar items already in the inventory should be shown, so the user can open the existing item instead of creating a duplicate.

**Acceptance Criteria:**
- [ ] While adding an item, similar existing items are shown (e.g. based on the photo or the entered name)
- [ ] Each suggestion can be recognized at a glance (photo, name, location)
- [ ] The user can open a suggested item instead of creating a new one
- [ ] The user can ignore the suggestions and create the item anyway
- [ ] No suggestions are shown when nothing similar exists

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

### UX-026: Link items and locations in the changelog
**Priority:** Medium

**Description:**
The changelog names the items and locations that were changed, but they can't be opened from there. Users who see a change often want to look at the item or location right away, for example to check where something was moved.

**Acceptance Criteria:**
- [ ] Items and locations in changelog entries link to their page
- [ ] Entries of deleted items or locations show the name without a broken link
- [ ] Links work for all kinds of changes (created, edited, moved, deleted)

---

### UX-027: Several pictures per item
**Priority:** Medium

**Description:**
An item has only one picture, but many items need more than one view to be recognized or described well, e.g. the front and the type plate. Users should be able to add several pictures, and the AI analysis should use all of them, so it can read details that a single picture doesn't show.

**Acceptance Criteria:**
- [ ] An item can have several pictures, and one of them is the main picture shown in lists
- [ ] Pictures can be added, removed and reordered when adding or editing an item
- [ ] The AI analysis uses all pictures of the item
- [ ] Existing items keep their picture as the main picture

---

### UX-028: Backup page on phones
**Priority:** Low

**Description:**
The backup page is hard to use on a phone: the list of backups and its actions don't fit the narrow screen. Admins should be able to create, download, restore and delete backups on a phone as easily as on a desktop.

**Acceptance Criteria:**
- [ ] The backup list fits a phone screen without horizontal scrolling
- [ ] All actions are easy to reach and tap on a phone
- [ ] Name, date and size of each backup stay readable

---

## AI Features

Item recognition and suggestions with generative AI.

### AI-003: Suggest new categories
**Priority:** Low

**Description:**
Items can only be put into the curated categories. When the AI recognizes an item that fits none of them well, it should be able to suggest a new category, which the user accepts or rejects, so the category list grows with the inventory without becoming cluttered.

**Acceptance Criteria:**
- [ ] When no existing category fits, the AI can suggest a new one
- [ ] A suggested category is clearly marked as new
- [ ] The user can accept the suggestion, which adds the category, or reject it
- [ ] Rejected suggestions don't create a category
- [ ] Only authorized users can add categories this way

---

### AI-004: Choose the AI provider
**Priority:** Low

**Description:**
Item descriptions and photo search only work with Google Gemini. Being able to use other AI providers (other cloud services or a locally hosted model) avoids depending on one vendor and lets the space choose by cost, quality or privacy.

**Acceptance Criteria:**
- [ ] The AI provider can be chosen in the configuration
- [ ] Item descriptions and photo search work with every supported provider
- [ ] Without a configured provider, the AI features are hidden and the rest of the app works
- [ ] Setup documentation describes how to configure each provider

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

## Briefings

Machines and tools that may only be used after a briefing.

### BRIEF-001: Items that require a briefing
**Priority:** Medium

**Description:**
Some machines and tools may only be used after a safety briefing ("Einweisung"). The inventory should show which items need a briefing and who has received it, so members know before using an item whether they are allowed to.

**Acceptance Criteria:**
- [ ] An item can be marked as requiring a briefing
- [ ] Items requiring a briefing are recognizable in the item list and on the item page
- [ ] It can be recorded which members received a briefing for an item, and when
- [ ] Members can see for which items they have received a briefing
- [ ] Only authorized people can record a briefing

---

## Stock

Quantities of consumables and small parts.

### STOCK-001: Track stock of consumables
**Priority:** Medium

**Description:**
Consumables and small parts (screws, filament, …) exist in quantities. Items should optionally have a stock count: taking something out lowers it, and a warning shows when the stock falls below a minimum, so it can be reordered in time. Related to UX-017 (report an item as used up).

**Acceptance Criteria:**
- [ ] An item can optionally have a quantity
- [ ] Taking items out lowers the quantity with little effort (e.g. from the item page)
- [ ] A minimum stock can be set per item
- [ ] Items below their minimum stock are flagged and can be listed
- [ ] Changes to the quantity are traceable in the changelog

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

---

### OPS-004: Clean up unused images
**Priority:** Low

**Description:**
Images of deleted items and locations, and images that were replaced, stay on the server so that undoing a change from the changelog brings the image back. Over time, images that nothing can restore anymore pile up. An admin should be able to free that space without breaking anything that's still shown or can still be undone.

**Acceptance Criteria:**
- [ ] An admin can remove images that no item, location or changelog entry refers to
- [ ] Images that are shown or can be restored via undo are never removed
- [ ] The admin sees how many images and how much space would be freed before confirming
- [ ] Backups and restores keep working as before

---

### OPS-005: Backups created several times
**Priority:** High

**Description:**
Creating a backup on a phone produced several backups within seconds instead of one. Duplicate backups take up space and make it unclear which one to restore. One request to create a backup should always result in exactly one backup.

**Acceptance Criteria:**
- [ ] Creating a backup on a phone results in exactly one backup
- [ ] Tapping the button again while a backup is being created doesn't start another one
- [ ] The cause is understood, and other actions with the same problem are fixed too
