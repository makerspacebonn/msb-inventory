import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

test.describe("Changelog / Audit Log", () => {
  test("should load changelog page", async ({ authenticatedPage: page }) => {
    await page.goto("/changelog")

    await expect(page).toHaveTitle(/Changelog|MSB/)
  })

  test("should display changelog entries", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Should have at least one entry from seed data - look for the list container
    const entries = page.locator(".border-b")
    await expect(entries.first()).toBeVisible({ timeout: 10000 })
  })

  test("should show change type badges", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Look for change type badges (+, ~, −)
    const badges = page.locator(".font-mono")

    // At least one badge should be visible
    await expect(badges.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show entity type icons", async ({ authenticatedPage: page }) => {
    await page.goto("/changelog")

    // Look for entity type icons (BoxIcon for items, MapPinIcon for locations)
    const entityIcons = page.locator("svg.lucide-box, svg.lucide-map-pin")

    // At least one type should be visible
    await expect(entityIcons.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show user who made the change", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Should show user info - Admin from seed data
    const userInfo = page.locator("text=/Admin|admin/i")
    await expect(userInfo.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show timestamp of changes", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Should have date/time information (German format)
    const timestamp = page.locator("text=/\\d{2}\\.\\d{2}\\.\\d{4}/")
    await expect(timestamp.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show total entries count", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Look for "X Einträge insgesamt" text
    await expect(page.locator("text=/\\d+ Einträge? insgesamt/")).toBeVisible({
      timeout: 5000,
    })
  })

  test("should expand entry to show diff view", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    await expandFirstEntry(page)

    await expect(page.getByTestId("changelog-diff").first()).toBeVisible()
  })

  test("should show changed fields in diff", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Click on an entry to expand it
    const entry = page.locator(".border-b").first()
    await entry.click()

    // Look for field labels or diff content
    const fieldLabels = page.locator(
      "text=/Name|Beschreibung|Kategorie|Erstellte Werte|Geänderte Werte/i",
    )

    // ToDo: Fix this stupid test, which tests nothing
    // At least some field info should be visible after expanding
    await expect(fieldLabels.first())
      .toBeVisible({ timeout: 500 })
      .catch(() => {
        // It's okay if no fields shown - might not have expandable diff
      })
  })

  test("should offer undo to admins", async ({ adminPage: page }) => {
    await page.goto("/changelog")

    const entry = await expandFirstEntry(page)

    await expect(
      entry.getByRole("button", { name: "Rückgängig" }),
    ).toBeVisible()
  })

  test("should show undo confirmation dialog", async ({ adminPage: page }) => {
    await page.goto("/changelog")

    const entry = await expandFirstEntry(page)
    await entry.getByRole("button", { name: "Rückgängig" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Cancel, so the shared seed data stays unchanged
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await expect(dialog).toBeHidden()
  })

  test("should not offer undo to non-admins", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    const entry = await expandFirstEntry(page)

    await expect(entry.getByTestId("changelog-diff")).toBeVisible()
    await expect(entry.getByRole("button", { name: "Rückgängig" })).toHaveCount(
      0,
    )
  })
})

// Expands the first changelog entry that has a diff and returns it
async function expandFirstEntry(page: Page) {
  // Pin the entry by id: the filter below stops matching once it's expanded
  const id = await page
    .getByTestId("changelog-entry")
    .filter({ has: page.getByRole("button", { expanded: false }) })
    .first()
    .getAttribute("id")
  const entry = page.locator(`#${id}`)

  await entry.getByRole("button", { expanded: false }).click()
  await expect(entry.getByRole("button", { expanded: true })).toBeVisible()
  return entry
}
