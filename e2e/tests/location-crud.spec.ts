import { expect, test } from "../fixtures/auth.fixture"

test.describe("Location Management (Authenticated)", () => {
  test("offers adding an image to a location", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/locations?id=1")

    await page.getByRole("button", { name: "Bild hinzufügen" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText('Füge ein Bild zu "Werkstatt" hinzu.')
    // Nothing to save before an image is chosen
    await expect(
      dialog.getByRole("button", { name: "Speichern" }),
    ).toBeDisabled()

    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await expect(dialog).toBeHidden()
  })

  test("creates a location with a description", async ({
    authenticatedPage: page,
  }) => {
    const name = `E2E Neu ${Date.now()}`
    await page.goto("/locations")

    await page.getByRole("button", { name: "Neue Location" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByLabel("Beschreibung").fill("Kiste unter dem Tisch")
    await page.getByRole("button", { name: "Erstellen" }).click()

    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    await expect(page.getByText("Kiste unter dem Tisch")).toBeVisible()
  })

  test("offers deleting an empty location", async ({
    authenticatedPage: page,
  }) => {
    // Büro has neither sublocations nor items
    await page.goto("/locations?id=3")

    await expect(
      page.getByRole("button", { name: "Location löschen" }),
    ).toBeVisible()
  })

  test("prevents deleting a location with sublocations", async ({
    authenticatedPage: page,
  }) => {
    // Werkstatt has sublocations
    await page.goto("/locations?id=1")

    await expect(
      page.getByRole("heading", { name: "Werkstatt", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Location löschen" }),
    ).toHaveCount(0)
  })

  test("prevents deleting a location with items", async ({
    authenticatedPage: page,
  }) => {
    // Schublade 1 has items but no sublocations
    await page.goto("/locations?id=100")

    await expect(
      page.getByRole("heading", { name: "Schublade 1", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Location löschen" }),
    ).toHaveCount(0)
  })
})

test.describe("Location Management (Unauthenticated)", () => {
  test("offers no management actions", async ({ page }) => {
    await page.goto("/locations?id=3")

    await expect(
      page.getByRole("heading", { name: "Büro", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Bild hinzufügen" }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Location löschen" }),
    ).toHaveCount(0)
  })
})
