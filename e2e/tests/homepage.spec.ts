import { test, expect } from "@playwright/test"

test.describe("Homepage", () => {
  test("should load successfully", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveTitle(/MSB Inventar/)
    await expect(page.locator("h1")).toContainText("MakerSpace Bonn")
  })

  test("should display statistics cards", async ({ page }) => {
    await page.goto("/")

    // Check for the 4 stat cards
    await expect(page.locator("text=Gesamte Items")).toBeVisible()
    await expect(page.locator("text=Standorte")).toBeVisible()
    await expect(page.locator("text=Mit Bildern")).toBeVisible()
    await expect(page.locator("text=Neu (30 Tage)")).toBeVisible()
  })

  test("should display stat values as numbers", async ({ page }) => {
    await page.goto("/")

    // Stats should contain numeric values - look for the stat grid
    const statValues = page.locator("text=/\\d+/")
    const count = await statValues.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test("should have navigation to items page", async ({ page }) => {
    await page.goto("/")

    // Use .first() since there may be multiple Items links (nav + button)
    const itemsButton = page.locator('a[href="/items"]').first()
    await expect(itemsButton).toBeVisible()

    await itemsButton.click()
    await expect(page).toHaveURL("/items")
  })

  test("should display last updated timestamp", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("text=Stand:")).toBeVisible()
  })
})
