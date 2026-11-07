import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

// Seed data: Werkstatt → Werkbank 2 (no image), Werkstatt → Werkbank 1
// (with an image to mark the spot on)

async function startItem(page: Page, name: string) {
  await page.goto("/items/add")
  await page.getByLabel("Name", { exact: true }).fill(name)
}

const picker = (page: Page, name: string) =>
  page.getByRole("heading", { name: `Ort auswählen für ${name}` })

/** The changelog entries of one kind of change to the item */
function entries(page: Page, change: string, name: string) {
  return page.getByTestId("changelog-entry").filter({
    has: page.getByRole("button", { name: `${change} Item ${name}` }),
  })
}

test.describe("Choosing the location when adding an item", () => {
  test("saves the item together with its location, as one change", async ({
    authenticatedPage: page,
  }) => {
    const name = `Mit Ort ${Date.now()}`
    await startItem(page, name)
    await page.getByRole("button", { name: "Weiter zum Ort" }).click()

    // Nothing is saved yet
    await expect(picker(page, name)).toBeVisible()
    await expect(page).toHaveURL("/items/add")

    await page.getByRole("button", { name: "Werkstatt", exact: true }).click()
    await page.getByRole("button", { name: "Werkbank 2", exact: true }).click()
    await page.getByRole("button", { name: "Hier ablegen" }).click()

    await expect(page).toHaveURL(/\/i\/\d+$/)
    await expect(
      page.getByRole("heading", { level: 1, name, exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Werkbank 2", { exact: true })).toBeVisible()

    await page.goto("/changelog")
    const created = entries(page, "Erstellt", name)
    await expect(created).toHaveCount(1)
    await expect(entries(page, "Geändert", name)).toHaveCount(0)
    await created.getByRole("button", { expanded: false }).click()
    await expect(created.getByTestId("changelog-diff")).toContainText(
      "Location",
    )
  })

  test("marks the spot on a location with an image", async ({
    authenticatedPage: page,
  }) => {
    const name = `Mit Markierung ${Date.now()}`
    await startItem(page, name)
    await page.getByRole("button", { name: "Weiter zum Ort" }).click()
    await page.getByRole("button", { name: "Werkstatt", exact: true }).click()
    await page.getByRole("button", { name: "Werkbank 1", exact: true }).click()
    await page.getByRole("button", { name: "Hier ablegen" }).click()

    await expect(
      page.getByRole("heading", { name: "Position markieren" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Werkbank 1" }).click()
    await page.getByRole("button", { name: "Speichern", exact: true }).click()
    await expect(page).toHaveURL(/\/i\/\d+$/)

    await page.goto("/changelog")
    const created = entries(page, "Erstellt", name)
    await created.getByRole("button", { expanded: false }).click()
    const diff = created.getByTestId("changelog-diff")
    await expect(diff).toContainText("Location")
    await expect(diff).toContainText("Position")
  })

  test("goes to the location on Enter, and back keeps what was entered", async ({
    authenticatedPage: page,
  }) => {
    const name = `Zurück ${Date.now()}`
    await startItem(page, name)
    await page.getByLabel("Name", { exact: true }).press("Enter")
    await expect(picker(page, name)).toBeVisible()

    await page.getByRole("button", { name: "Abbrechen" }).click()
    await expect(picker(page, name)).toHaveCount(0)
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name)
  })

  test("can still save without a location", async ({
    authenticatedPage: page,
  }) => {
    const name = `Ohne Ort ${Date.now()}`
    await startItem(page, name)
    await page.getByRole("button", { name: "Weiter zum Ort" }).click()
    await expect(picker(page, name)).toBeVisible()

    await page.getByRole("button", { name: "Ohne Ort speichern" }).click()
    await expect(page).toHaveURL(/\/i\/\d+$/)
    await expect(page.getByText("Kein Ort hinterlegt")).toBeVisible()
  })

  test("doesn't ask for a location when editing", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/add?itemId=2")
    await expect(
      page.getByRole("button", { name: "Weiter zum Ort" }),
    ).toHaveCount(0)
    await page.getByRole("button", { name: "Speichern" }).click()
    await expect(page).toHaveURL("/i/2")
  })
})
