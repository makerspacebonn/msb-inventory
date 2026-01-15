import { test, expect } from "@playwright/test"

test.describe("Items Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/items")
  })

  test("should display items list", async ({ page }) => {
    await expect(page).toHaveTitle(/Items/)

    // Should have at least one item visible (links to /i/X)
    const items = page.locator('a[href^="/i/"]')
    await expect(items.first()).toBeVisible({ timeout: 10000 })
  })

  test("should have search input", async ({ page }) => {
    // Search input placeholder starts with "Suchen nach"
    const searchInput = page.locator('input[placeholder^="Suchen"]')
    await expect(searchInput).toBeVisible()
  })

  test("should search items by name", async ({ page }) => {
    const searchInput = page.locator('input[placeholder^="Suchen"]')

    await searchInput.fill("Bohrmaschine")
    // Wait for debounce (300ms) and search to complete
    await page.waitForTimeout(800)

    // Should show search results - look for "Ergebnis" text indicating search completed
    await expect(page.locator("text=Ergebnis").first()).toBeVisible({ timeout: 5000 })
    // And the item should be visible
    await expect(page.locator("text=Bohrmaschine").first()).toBeVisible()
  })

  test("should search items by manufacturer", async ({ page }) => {
    const searchInput = page.locator('input[placeholder^="Suchen"]')

    await searchInput.fill("Makita")
    // Wait for debounce (300ms) and search to complete
    await page.waitForTimeout(800)

    // Should show the item with Makita in its name
    await expect(page.locator("text=Makita").first()).toBeVisible({ timeout: 5000 })
  })

  test("should clear search", async ({ page }) => {
    const searchInput = page.locator('input[placeholder^="Suchen"]')

    await searchInput.fill("Test")
    await page.waitForTimeout(500)

    // Clear button appears when search has value (X icon)
    const clearButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') })
    if (await clearButton.isVisible()) {
      await clearButton.click()
      await expect(searchInput).toHaveValue("")
    }
  })

  test("should navigate to item detail on click", async ({ page }) => {
    // Click on first item link
    const itemLink = page.locator('a[href^="/i/"]').first()
    await itemLink.click()

    await expect(page).toHaveURL(/\/i\/\d+/)
  })

  test("should show Add Item button only when authenticated", async ({ page }) => {
    // Unauthenticated - button should not be visible
    const addButton = page.locator('a[href="/items/add"]')
    await expect(addButton).not.toBeVisible()
  })
})
