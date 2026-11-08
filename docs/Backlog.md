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

### PRINT-004: Keep the label printer status
**Priority:** Low

**Description:**
The server only knows a label printer's status from the messages it receives while running. After a restart of the app, the status is unknown until the printer reports again. The last known status of the printers and of the connection should be kept, so it is shown right away after a restart.

**Acceptance Criteria:**
- [ ] The last known status of each label printer is kept across restarts
- [ ] The state of the connection to the message broker is kept as well
- [ ] A kept status shows how old it is, so an outdated one isn't taken as current

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

### UX-031: Crop the photo for the photo search
**Priority:** Medium

**Description:**
A photo taken for the search often shows more than the item that's being looked for: the table, other things, the hand holding it. Everything on the photo influences the search. Being able to crop the photo to the item, like when adding an item, should make the search find the right item more often.

**Acceptance Criteria:**
- [ ] The photo for the search can be cropped before searching
- [ ] Cropping works the same way as for item pictures
- [ ] Searching with the whole photo stays possible without an extra step

---

### UX-032: Light mode
**Priority:** Low

**Description:**
The app is always dark. In bright rooms, such as the workshop in daylight, or for people who prefer it, a light look is easier to read. The app should offer a light mode as well.

**Acceptance Criteria:**
- [ ] The app has a light and a dark look
- [ ] By default it follows the device's setting
- [ ] Users can switch between light and dark, and the choice is remembered
- [ ] All pages, including charts and location images with markers, are readable in both

---

## AI Features

Item recognition and suggestions with generative AI.

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

### AI-005: Check suggested links
**Priority:** Medium

**Description:**
The AI suggests links for an item, such as the manufacturer page or a manual, but it sometimes suggests addresses that don't exist. Users only notice when they open a link later. Suggested links should be checked before they are offered, so only working links end up on an item.

**Acceptance Criteria:**
- [ ] Links suggested by the AI are checked to see whether they exist
- [ ] Links that don't exist are not offered, or are clearly marked
- [ ] A slow or failing check doesn't block the rest of the AI analysis

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

## Inventory Check

Checking that the inventory matches what is really there.

### INV-001: Inventory check
**Priority:** Medium

**Description:**
Over time the inventory drifts away from reality: items get lost, moved or used up without anyone recording it. An inventory check lets members confirm what is really there, either for a whole area at once or bit by bit over time. Details still need to be discussed.

**Acceptance Criteria:**
- [ ] Members can check a location completely in one go
- [ ] Items can also be checked occasionally over time, without a full check
- [ ] It is visible when an item or location was last checked
- [ ] Items that were not found during a check are flagged
- [ ] Open details are agreed on before implementation

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

## Promotion

Pointing members to interesting items.

### PROMO-001: Promote items
**Priority:** Low

**Description:**
Some items are worth knowing about, but members don't find them unless they look for them. Users should be able to promote an item they find really cool, with a short text why. A Discord bot can then pick up the promoted items and tell the members about them.

**Acceptance Criteria:**
- [ ] Logged-in users can promote an item with a free text explaining why
- [ ] Promoted items can be read through an API secured with an API key
- [ ] Each promotion is picked up once, so the bot doesn't announce the same item again and again
- [ ] Promotions can be withdrawn

---

## Privacy

What the app stores about people.

### PRIV-001: Information for the privacy notice
**Priority:** Medium

**Description:**
The makerspace has to tell its members what personal data it processes (DSGVO). The app stores data about people, for example from the login and in the changelog. The makerspace needs a list of what the app stores, why and for how long, to add it to its privacy document.

**Acceptance Criteria:**
- [ ] All personal data the app stores is listed, including in backups and logs
- [ ] For each, the purpose and how long it is kept is described
- [ ] Data that is deliberately not stored is named (e.g. no IP addresses for view counting)
- [ ] The list is written so it can be taken into the makerspace's privacy document

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

### OPS-004: Clean up unused images
**Priority:** Low

**Description:**
Images of deleted items and locations, and images that were replaced, stay on the server so that undoing a change from the changelog brings the image back. Over time, images that nothing can restore anymore pile up. An admin should be able to free that space without breaking anything that's still shown or can still be undone.

**Acceptance Criteria:**
- [ ] An admin can remove images that no item, location or changelog entry refers to
- [ ] Images that are shown or can be restored via undo are never removed
- [ ] The admin sees how many images and how much space would be freed before confirming
- [ ] Backups and restores keep working as before
