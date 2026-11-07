import type { Page } from "@playwright/test"
import { expect, TEST_ADMIN, test } from "../fixtures/auth.fixture"
import { gotoSeededEntry } from "../fixtures/changelog"

// Seeded changelog entries that no other test changes:
// - item "Bohrmaschine Makita" created by the admin
// - location "Werkstatt" created by the admin
async function expandEntry(page: Page, entityName: string) {
  const entry = await gotoSeededEntry(page, entityName)
  await entry.getByRole("button", { expanded: false }).click()
  await expect(entry.getByRole("button", { expanded: true })).toBeVisible()
  return entry
}

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

async function createItem(page: Page, name: string) {
  await page.goto("/items/add")
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByRole("button", { name: "Erstellen" }).click()
  await expect(page).toHaveURL(/\/i\/\d+$/)
  return new URL(page.url()).pathname
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
    const itemEntry = await gotoSeededEntry(page, "Bohrmaschine Makita")
    await expect(itemEntry.getByRole("button")).toHaveAccessibleName(
      /Erstellt\s*Item\s*Bohrmaschine Makita/,
    )
    await expect(itemEntry).toContainText(TEST_ADMIN.name)
    await expect(itemEntry).toContainText(/\d{2}\.\d{2}\.\d{4}/)

    const locationEntry = await gotoSeededEntry(page, "Werkstatt")
    await expect(locationEntry.getByRole("button")).toHaveAccessibleName(
      /Erstellt\s*Location\s*Werkstatt/,
    )
  })

  test("shows the created values when expanding an entry", async ({
    authenticatedPage: page,
  }) => {
    const entry = await expandEntry(page, "Bohrmaschine Makita")

    const diff = entry.getByTestId("changelog-diff")
    await expect(diff).toContainText("Erstellte Werte")
    await expect(diff).toContainText("Name")
    await expect(diff).toContainText("Elektrowerkzeug")
  })

  test("offers undo to admins", async ({ adminPage: page }) => {
    const entry = await expandEntry(page, "Bohrmaschine Makita")

    await expect(
      entry.getByRole("button", { name: "Rückgängig" }),
    ).toBeVisible()
  })

  test("asks for confirmation before undoing", async ({ adminPage: page }) => {
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
    const entry = await expandEntry(page, "Bohrmaschine Makita")

    await expect(entry.getByTestId("changelog-diff")).toBeVisible()
    await expect(entry.getByRole("button", { name: "Rückgängig" })).toHaveCount(
      0,
    )
  })
})

test.describe("Changelog: links", () => {
  test("opens the page of the changed item or location", async ({
    authenticatedPage: page,
  }) => {
    const itemEntry = await gotoSeededEntry(page, "Bohrmaschine Makita")
    await itemEntry
      .getByRole("link", { name: "Bohrmaschine Makita öffnen" })
      .click()
    await expect(page).toHaveURL(/\/i\/\d+$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Bohrmaschine Makita" }),
    ).toBeVisible()

    const locationEntry = await gotoSeededEntry(page, "Werkstatt")
    await locationEntry.getByRole("link", { name: "Werkstatt öffnen" }).click()
    await expect(
      page.getByRole("heading", { name: "Werkstatt", exact: true }),
    ).toBeVisible()
  })

  test("links every change of an item until it is deleted", async ({
    authenticatedPage: page,
  }) => {
    const name = `Link ${Date.now()}`
    const itemPath = await createItem(page, name)
    const id = itemPath.split("/").at(-1)

    // Move it into "Werkbank 2", which has no image to place it on
    await page.goto(`/items/${id}/location/add?at=11`)
    await page.getByRole("button", { name: "Hier ablegen" }).click()
    await expect(page).toHaveURL(itemPath)

    await page.goto("/changelog")
    const created = changeEntry(page, "Erstellt", "Item", name)
    const moved = changeEntry(page, "Geändert", "Item", name)
    for (const entry of [created, moved]) {
      await expect(
        entry.getByRole("link", { name: `${name} öffnen` }),
      ).toHaveAttribute("href", itemPath)
    }

    await page.goto(itemPath)
    await page.getByRole("button", { name: "Item löschen" }).click()
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Löschen" })
      .click()
    await expect(page).toHaveURL("/items")

    // Still named, but no longer linked to a page that doesn't exist
    await page.goto("/changelog")
    const deleted = changeEntry(page, "Gelöscht", "Item", name)
    for (const entry of [created, moved, deleted]) {
      await expect(entry.getByText(name, { exact: true })).toBeVisible()
      await expect(entry.getByRole("link")).toHaveCount(0)
    }
  })
})

// These tests change data they create themselves, so the seed stays as it is
test.describe("Changelog: undo", () => {
  async function undo(page: Page, entry: ReturnType<typeof changeEntry>) {
    await entry.getByRole("button", { expanded: false }).click()
    await entry.getByRole("button", { name: "Rückgängig" }).click()
    await page
      .getByRole("dialog", { name: "Änderung rückgängig machen?" })
      .getByRole("button", { name: "Ja, rückgängig machen" })
      .click()
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

  test.describe("of changes made together", () => {
    /** Creates an item and renames it; returns its id */
    async function editedItem(page: Page, name: string) {
      const itemPath = await createItem(page, name)
      const id = Number(itemPath.split("/").at(-1))
      await page.goto(`/items/add?itemId=${id}`)
      await page.getByLabel("Name", { exact: true }).fill(`${name} neu`)
      await page.getByRole("button", { name: "Speichern" }).click()
      await expect(page).toHaveURL(itemPath)
      return id
    }

    async function groupChanges(
      page: Page,
      itemIds: number[],
      addMissingItem = false,
    ) {
      const response = await page.request.post("/api/e2e/group-changes", {
        data: { itemIds, addMissingItem },
      })
      expect(response.status(), await response.text()).toBe(200)
    }

    async function expectItemName(page: Page, id: number, name: string) {
      await page.goto(`/i/${id}`)
      await expect(
        page.getByRole("heading", { level: 1, name, exact: true }),
      ).toBeVisible()
    }

    test("undoes them all, and the undo can be undone as a whole", async ({
      adminPage: page,
    }) => {
      const stamp = Date.now()
      const [a, b] = [`Gruppe A ${stamp}`, `Gruppe B ${stamp}`]
      const ids = [await editedItem(page, a), await editedItem(page, b)]
      await groupChanges(page, ids)

      await page.goto("/changelog")
      // One line for the action; the other entry opens below it
      const group = page
        .getByTestId("changelog-group")
        .filter({ hasText: `${b} neu` })
      await expect(
        changeEntry(page, "Geändert", "Item", `${a} neu`),
      ).toHaveCount(0)
      await group.getByRole("button", { name: /1 weitere Änderung/ }).click()
      const entry = changeEntry(page, "Geändert", "Item", `${a} neu`)
      await entry.getByRole("button", { expanded: false }).click()
      await entry.getByRole("button", { name: "Rückgängig" }).click()
      const dialog = page.getByRole("dialog", {
        name: "Änderung rückgängig machen?",
      })
      await expect(dialog).toContainText("Alle 2 Einträge")
      await dialog
        .getByRole("button", { name: "Ja, rückgängig machen" })
        .click()
      await expect(
        page.getByText("2 Änderungen rückgängig gemacht"),
      ).toBeVisible()

      await expectItemName(page, ids[0], a)
      await expectItemName(page, ids[1], b)

      // The undo's own entries are a group again. Entries show the current
      // name, and the newest "Geändert" entry for A is the undo
      await page.goto("/changelog")
      await undo(page, changeEntry(page, "Geändert", "Item", a).first())
      await expect(
        page.getByText("2 Änderungen rückgängig gemacht"),
      ).toBeVisible()
      await expectItemName(page, ids[0], `${a} neu`)
      await expectItemName(page, ids[1], `${b} neu`)
    })

    test("changes nothing when one of them can't be undone", async ({
      adminPage: page,
    }) => {
      const name = `Gruppe Fehler ${Date.now()}`
      const id = await editedItem(page, name)
      await groupChanges(page, [id], true)

      await page.goto("/changelog")
      await undo(page, changeEntry(page, "Geändert", "Item", `${name} neu`))
      await expect(page.getByText("Item existiert nicht mehr")).toBeVisible()

      // The item was reverted first, and that has been rolled back
      await expectItemName(page, id, `${name} neu`)
    })

    test("is blocked by a newer change to any of them", async ({
      adminPage: page,
    }) => {
      const stamp = Date.now()
      const [a, b] = [`Konflikt A ${stamp}`, `Konflikt B ${stamp}`]
      const ids = [await editedItem(page, a), await editedItem(page, b)]
      await groupChanges(page, ids)

      // Another change to B only, on the same field
      await page.goto(`/items/add?itemId=${ids[1]}`)
      await page.getByLabel("Name", { exact: true }).fill(`${b} später`)
      await page.getByRole("button", { name: "Speichern" }).click()
      await expect(page).toHaveURL(`/i/${ids[1]}`)

      await page.goto("/changelog")
      const group = page.getByTestId("changelog-group").filter({
        has: page.getByRole("button", { name: /1 weitere Änderung/ }),
        hasText: `${b} später`,
      })
      await undo(page, group.getByTestId("changelog-entry"))
      await expect(
        page.getByText(/Eine neuere Änderung existiert/),
      ).toBeVisible()

      await expectItemName(page, ids[0], `${a} neu`)
      await expectItemName(page, ids[1], `${b} später`)
    })
  })
})
