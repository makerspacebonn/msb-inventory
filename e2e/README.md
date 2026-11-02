# E2E Tests

Playwright tests that run against the app in Docker with seeded data
(`scripts/seed-e2e-data.ts`).

```bash
bun run e2e                     # all tests
bun run e2e items.spec.ts       # one file
bun run e2e:report              # open the last HTML report
```

## Writing tests

A test must fail when, and only when, the behavior it describes is broken.

### Find elements the way users do

Prefer, in this order:

1. `getByRole` with an accessible name: `getByRole("button", { name: "Abmelden" })`
2. `getByLabel` for form fields, `getByPlaceholder` when there's no label
3. `getByText` for plain content
4. `getByTestId` only when nothing above identifies the element (e.g. a
   list row like `changelog-entry`)

Don't select by styling: no CSS classes (`.border-b`, `.font-mono`), icon
classes (`svg.lucide-trash-2`) or bare tags (`h2`, `button:has-text(...)`).

**Icon-only buttons need an `aria-label`.** If a test can't find a button by
name, screen-reader users can't either. Fix the component, not the test.

### Never let a check pass silently

- No `try/catch` or `.catch(() => {})` around assertions
- No `if (await x.isVisible())`: if the element should be there, assert it
- No `expect(a || b).toBeTruthy()`: decide what the correct behavior is
- No `waitForTimeout`: wait for the result with a web-first assertion
  (`await expect(...).toBeVisible()`, `toHaveCount(0)`, `toHaveURL`)

### Avoid `.first()` to silence strict mode

A selector that matches several elements usually matches the wrong one. For
example, after a client-side navigation the URL changes before the new page
replaces the old one, so `.first()` can match the old page. Scope the
locator (`getByRole("banner").getByText(...)`, a test id row,
`exact: true`) or wait for something only the new page has.

### Absent elements

Check absence with `toHaveCount(0)`, and first assert something that proves
the page has loaded, so the check doesn't pass on an empty page:

```ts
await expect(page.getByRole("heading", { name: "Werkstatt" })).toBeVisible()
await expect(page.getByRole("button", { name: "Location löschen" })).toHaveCount(0)
```

### Shared data

Tests run in parallel against the same database.

- Read seed data, but don't change it. A test that changes something
  creates its own data first (see `createItem` in `item-crud.spec.ts`).
- Don't rely on positions in lists that other tests add to. Find entries by
  name instead.
- The homepage statistics are cached for 24 hours and filled before seeding,
  so don't assert exact counts there.
- Use the fixtures in `fixtures/auth.fixture.ts` for logged-in pages:
  `authenticatedPage` (normal user), `adminPage`, `logoutTestPage` (session
  that may be invalidated).
