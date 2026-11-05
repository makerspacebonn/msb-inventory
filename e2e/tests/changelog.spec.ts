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

// These tests change data they create themselves, so the seed stays as it is
test.describe("Changelog: undo", () => {
  const escapeRegExp = (text: string) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  /** The entry for one change, found by its summary, e.g. "Geändert Item X" */
  function changeEntry(page: Page, change: string, kind: string, name: string) {
    return page.getByTestId("changelog-entry").filter({
      has: page.getByRole("button", {
        name: new RegExp(`${change}\\s*${kind}\\s*${escapeRegExp(name)}\\b`),
      }),
    })
  }

  async function undo(page: Page, entry: ReturnType<typeof changeEntry>) {
    await entry.getByRole("button", { expanded: false }).click()
    await entry.getByRole("button", { name: "Rückgängig" }).click()
    await page
      .getByRole("dialog", { name: "Änderung rückgängig machen?" })
      .getByRole("button", { name: "Ja, rückgängig machen" })
      .click()
  }

  async function createItem(page: Page, name: string) {
    await page.goto("/items/add")
    await page.getByLabel("Name", { exact: true }).fill(name)
    await page.getByRole("button", { name: "Erstellen" }).click()
    await expect(page).toHaveURL(/\/i\/\d+$/)
    return new URL(page.url()).pathname
  }

  test("undoing an edit restores the item's old values", async ({
    adminPage: page,
  }) => {
    const name = `Undo Edit ${Date.now()}`
    const itemPath = await createItem(page, name)
    await page.goto(`/items/add?itemId=${itemPath.split("/").at(-1)}`)
    await page.getByLabel("Name", { exact: true }).fill(`${name} neu`)
    await page.getByRole("button", { name: "Speichern" }).click()
    await expect(page).toHaveURL(itemPath)

    await page.goto("/changelog")
    await undo(page, changeEntry(page, "Geändert", "Item", `${name} neu`))
    await expect(page.getByText("Änderung rückgängig gemacht")).toBeVisible()

    await page.goto(itemPath)
    await expect(
      page.getByRole("heading", { level: 1, name, exact: true }),
    ).toBeVisible()
  })

  test("undoing a creation deletes the item", async ({ adminPage: page }) => {
    const name = `Undo Create ${Date.now()}`
    const itemPath = await createItem(page, name)

    await page.goto("/changelog")
    await undo(page, changeEntry(page, "Erstellt", "Item", name))
    await expect(page.getByText("Eintrag gelöscht")).toBeVisible()

    // The undo is logged as a deletion of its own
    await expect(changeEntry(page, "Gelöscht", "Item", name)).toBeVisible()
    await page.goto(itemPath)
    await expect(
      page.getByRole("heading", { level: 1, name, exact: true }),
    ).toHaveCount(0)
  })

  test("undoing a deletion brings the location back", async ({
    adminPage: page,
  }) => {
    const name = `Undo Delete ${Date.now()}`
    await page.goto("/locations")
    await page.getByRole("button", { name: "Neue Location" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByRole("button", { name: "Erstellen" }).click()
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    const locationUrl = page.url()

    await page.getByRole("button", { name: "Location löschen" }).click()
    await page
      .getByRole("dialog", { name: "Location löschen" })
      .getByRole("button", { name: "Löschen" })
      .click()
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(
      0,
    )

    await page.goto("/changelog")
    await undo(page, changeEntry(page, "Gelöscht", "Location", name))
    await expect(page.getByText("Änderung rückgängig gemacht")).toBeVisible()

    await page.goto(locationUrl)
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
  })
})
