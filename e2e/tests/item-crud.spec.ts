import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

// Creates an item through the form and returns its id
async function createItem(page: Page, name: string) {
  await page.goto("/items/add")
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByRole("button", { name: "Erstellen" }).click()

  await expect(page).toHaveURL(/\/i\/\d+$/)
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible()
  return page.url().match(/\/i\/(\d+)$/)?.[1]
}

test.describe("Item CRUD Operations", () => {
  test.describe("Create Item", () => {
    test("opens the add item page from the navigation", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/items")

      await page
        .getByRole("banner")
        .getByRole("link", { name: "Item hinzufügen" })
        .click()

      await expect(page).toHaveURL("/items/add")
      await expect(page.getByLabel("Name", { exact: true })).toBeVisible()
    })

    test("requires an item name", async ({ authenticatedPage: page }) => {
      await page.goto("/items/add")

      await page.getByRole("button", { name: "Erstellen" }).click()

      await expect(
        page.getByText("Muss mindestens einen Buchstaben haben!"),
      ).toBeVisible()
      await expect(page).toHaveURL("/items/add")
    })

    test("creates a new item", async ({ authenticatedPage: page }) => {
      await createItem(page, `E2E Test Item ${Date.now()}`)
    })
  })

  test.describe("Edit Item", () => {
    test("opens the edit form from the item page", async ({
      authenticatedPage: page,
    }) => {
      await page.goto("/i/1")

      await page.getByRole("link", { name: "Bearbeiten" }).click()

      await expect(page).toHaveURL("/items/add?itemId=1")
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
        "Bohrmaschine Makita",
      )
    })

    test("saves an edited item", async ({ authenticatedPage: page }) => {
      // Uses its own item, so other tests reading seed items aren't affected
      const originalName = `Edit Test ${Date.now()}`
      const id = await createItem(page, originalName)

      await page.goto(`/items/add?itemId=${id}`)
      const nameInput = page.getByLabel("Name", { exact: true })
      await expect(nameInput).toHaveValue(originalName)
      await nameInput.fill(`${originalName} (edited)`)
      await page.getByRole("button", { name: "Speichern" }).click()

      await expect(page).toHaveURL(`/i/${id}`)
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `${originalName} (edited)`,
        }),
      ).toBeVisible()
    })
  })

  test.describe("Delete Item", () => {
    test("asks for confirmation and keeps the item on cancel", async ({
      authenticatedPage: page,
    }) => {
      const name = `Delete Test ${Date.now()}`
      const id = await createItem(page, name)

      await page.getByRole("button", { name: "Item löschen" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toContainText(name)

      await dialog.getByRole("button", { name: "Abbrechen" }).click()

      await expect(dialog).toBeHidden()
      await page.reload()
      await expect(page).toHaveURL(`/i/${id}`)
      await expect(
        page.getByRole("heading", { level: 1, name, exact: true }),
      ).toBeVisible()
    })

    test("deletes the item after confirmation", async ({
      authenticatedPage: page,
    }) => {
      const id = await createItem(page, `Delete Me ${Date.now()}`)

      await page.getByRole("button", { name: "Item löschen" }).click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Löschen" })
        .click()

      await expect(page).toHaveURL("/items")
      await page.goto(`/i/${id}`)
      await expect(
        page.getByRole("heading", { name: "Item nicht gefunden" }),
      ).toBeVisible()
    })
  })
})
