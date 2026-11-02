import type { Page } from "@playwright/test"
import { expect, TEST_ADMIN, test } from "../fixtures/auth.fixture"

// Seeded changelog entries that no other test changes:
// - item "Bohrmaschine Makita" created by the admin
// - location "Werkstatt" created by the admin
// Other tests add entries in parallel, so tests look entries up by name
// instead of relying on their position.
function seededEntry(page: Page, entityName: string) {
  return page
    .getByTestId("changelog-entry")
    .filter({ has: page.getByText(entityName, { exact: true }) })
}

async function expandEntry(page: Page, entityName: string) {
  const entry = seededEntry(page, entityName)
  await entry.getByRole("button", { expanded: false }).click()
  await expect(entry.getByRole("button", { expanded: true })).toBeVisible()
  return entry
}

test.describe("Changelog / Audit Log", () => {
  test("shows the total number of entries", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    await expect(page).toHaveTitle("Changelog | MSB Inventar")
    await expect(page.getByText(/^\d+ Einträge insgesamt$/)).toBeVisible()
  })

  test("describes what changed, who changed it and when", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    const itemEntry = seededEntry(page, "Bohrmaschine Makita")
    await expect(itemEntry.getByRole("button")).toHaveAccessibleName(
      /Erstellt\s*Item\s*Bohrmaschine Makita/,
    )
    await expect(itemEntry).toContainText(TEST_ADMIN.name)
    await expect(itemEntry).toContainText(/\d{2}\.\d{2}\.\d{4}/)

    const locationEntry = seededEntry(page, "Werkstatt")
    await expect(locationEntry.getByRole("button")).toHaveAccessibleName(
      /Erstellt\s*Location\s*Werkstatt/,
    )
  })

  test("shows the created values when expanding an entry", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    const entry = await expandEntry(page, "Bohrmaschine Makita")

    const diff = entry.getByTestId("changelog-diff")
    await expect(diff).toContainText("Erstellte Werte")
    await expect(diff).toContainText("Name")
    await expect(diff).toContainText("Elektrowerkzeug")
  })

  test("offers undo to admins", async ({ adminPage: page }) => {
    await page.goto("/changelog")

    const entry = await expandEntry(page, "Bohrmaschine Makita")

    await expect(
      entry.getByRole("button", { name: "Rückgängig" }),
    ).toBeVisible()
  })

  test("asks for confirmation before undoing", async ({ adminPage: page }) => {
    await page.goto("/changelog")

    const entry = await expandEntry(page, "Bohrmaschine Makita")
    await entry.getByRole("button", { name: "Rückgängig" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Bohrmaschine Makita")

    // Cancel, so the shared seed data stays unchanged
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await expect(dialog).toBeHidden()
  })

  test("does not offer undo to non-admins", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    const entry = await expandEntry(page, "Bohrmaschine Makita")

    await expect(entry.getByTestId("changelog-diff")).toBeVisible()
    await expect(entry.getByRole("button", { name: "Rückgängig" })).toHaveCount(
      0,
    )
  })
})
