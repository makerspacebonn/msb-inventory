import { expect, test } from "@playwright/test"
import { test as authTest } from "../fixtures/auth.fixture"

// Item 1 is "Bohrmaschine Makita" from the seed data, stored in
// Werkstatt → Werkbank 1 → Schublade 1
test.describe("Item Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/i/1")
  })

  test("shows the item name", async ({ page }) => {
    await expect(page).toHaveTitle("Bohrmaschine Makita | MSB Inventar")
    await expect(
      page.getByRole("heading", { level: 1, name: "Bohrmaschine Makita" }),
    ).toBeVisible()
  })

  test("shows manufacturer and model", async ({ page }) => {
    await expect(page.getByText("Hersteller")).toBeVisible()
    await expect(page.getByText("Makita", { exact: true })).toBeVisible()
    await expect(page.getByText("HR2470")).toBeVisible()
  })

  test("shows the description", async ({ page }) => {
    await expect(
      page.getByText("Professionelle Schlagbohrmaschine mit 18V Akku"),
    ).toBeVisible()
  })

  test("shows the tags", async ({ page }) => {
    for (const tag of ["Werkzeug", "Elektro", "Bohren"]) {
      await expect(page.getByText(tag, { exact: true })).toBeVisible()
    }
  })

  test("shows the full location path", async ({ page }) => {
    for (const location of ["Werkstatt", "Werkbank 1", "Schublade 1"]) {
      await expect(page.getByText(location, { exact: true })).toBeVisible()
    }
  })

  test("opens a location from the location path", async ({ page }) => {
    await page.getByRole("link", { name: "Werkbank 1", exact: true }).click()

    await expect(page).toHaveURL("/locations?id=10")
    await expect(
      page.getByRole("heading", { name: "Werkbank 1", exact: true }),
    ).toBeVisible()
  })

  test("offers opening every location in the path", async ({ page }) => {
    for (const [name, id] of [
      ["Werkstatt", 1],
      ["Werkbank 1", 10],
      ["Schublade 1", 100],
    ] as const) {
      await expect(
        page.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", `/locations?id=${id}`)
    }
  })

  test("zooms a location image without leaving the page", async ({ page }) => {
    // Werkbank 1 is the only seeded location with an image
    const zoom = page.getByRole("button", {
      name: "Bild von Werkbank 1 vergrößern",
    })
    await expect(zoom).toHaveAttribute("aria-pressed", "false")

    await zoom.click()

    const shrink = page.getByRole("button", {
      name: "Bild von Werkbank 1 verkleinern",
    })
    await expect(shrink).toHaveAttribute("aria-pressed", "true")
    await expect(page).toHaveURL("/i/1")

    await shrink.click()
    await expect(zoom).toHaveAttribute("aria-pressed", "false")
  })

  test("offers no zoom for locations without an image", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Werkstatt", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /^Bild von Werkstatt/ }),
    ).toHaveCount(0)
  })

  test("shows the QR code section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "QR-Code" })).toBeVisible()
  })

  test("does not offer editing when unauthenticated", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Bohrmaschine Makita" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Bearbeiten" })).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Item löschen" }),
    ).toHaveCount(0)
  })
})

// Changing an item's location is only offered to logged-in users
test.describe("Item location buttons", () => {
  const locationHeading = (page: import("@playwright/test").Page) =>
    page.getByRole("heading", { name: "Wo finde ich es?" })

  test("aren't shown to visitors", async ({ page }) => {
    await page.goto("/i/1")
    await expect(locationHeading(page)).toBeVisible()

    await expect(
      page.getByRole("link", { name: "Location ändern" }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Location entfernen" }),
    ).toHaveCount(0)
  })

  authTest("are shown to logged-in users", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/i/1")
    await expect(locationHeading(authenticatedPage)).toBeVisible()

    await expect(
      authenticatedPage.getByRole("link", { name: "Location ändern" }),
    ).toBeVisible()
    await expect(
      authenticatedPage.getByRole("button", { name: "Location entfernen" }),
    ).toBeVisible()
  })
})

test.describe("Missing Item", () => {
  test("tells the user the item doesn't exist", async ({ page }) => {
    await page.goto("/i/99999")

    await expect(
      page.getByRole("heading", { name: "Item nicht gefunden" }),
    ).toBeVisible()
    await page.getByRole("link", { name: "Zu allen Items" }).click()
    await expect(page).toHaveURL("/items")
  })
})
