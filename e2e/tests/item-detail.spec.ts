import { expect, test } from "@playwright/test"

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
