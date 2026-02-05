import { expect, test } from "@playwright/test"

test.describe("Locations Page", () => {
  test("should load locations page", async ({ page }) => {
    await page.goto("/locations")

    await expect(page).toHaveTitle(/Locations|MSB/)
  })

  test("should display root locations", async ({ page }) => {
    await page.goto("/locations")

    // Root locations from seed data
    await expect(page.locator("text=Werkstatt")).toBeVisible()
    await expect(page.locator("text=Lager")).toBeVisible()
    await expect(page.locator("text=Büro")).toBeVisible()
  })

  test("should navigate to child locations", async ({ page }) => {
    await page.goto("/locations")

    // Click on Werkstatt to see child locations (uses query param ?id=X)
    await page.locator("text=Werkstatt").first().click()

    // Should show child locations - wait for URL to change
    await expect(page).toHaveURL(/\?id=1/)
    // Use first() since there are Werkbank 1 and Werkbank 2
    await expect(page.locator("text=Werkbank").first()).toBeVisible({
      timeout: 5000,
    })
  })

  test("should show breadcrumb navigation", async ({ page }) => {
    // Navigate to Werkstatt location directly
    await page.goto("/locations?id=1")

    // Should show breadcrumb with current location (use first() since appears multiple times)
    await expect(page.locator("text=Werkstatt").first()).toBeVisible()
    // Should show "Start" breadcrumb link to navigate back to root
    await expect(page.locator("text=Start")).toBeVisible()
  })

  test("should navigate back to parent location", async ({ page }) => {
    // Navigate to Werkstatt first
    await page.goto("/locations?id=1")

    // Click "Start" breadcrumb to navigate back to root
    const startLink = page.locator("text=Start")
    await expect(startLink).toBeVisible()
    await startLink.click()

    // Should navigate back to root (no id param)
    await expect(page).toHaveURL("/locations")
    await expect(page.locator("text=Lager")).toBeVisible()
  })

  test("should display items at location", async ({ page }) => {
    // Navigate to Werkbank 1 (id=10) which has items
    await page.goto("/locations?id=10")

    // Should see "Items an diesem Ort" heading with count
    await expect(page.locator("text=Items an diesem Ort")).toBeVisible({
      timeout: 5000,
    })
  })
})
