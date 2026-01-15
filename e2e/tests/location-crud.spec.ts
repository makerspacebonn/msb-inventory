import { test, expect } from "../fixtures/auth.fixture"

test.describe("Location Management", () => {
  test.describe("View Locations", () => {
    test("should display location details", async ({ authenticatedPage: page }) => {
      // Navigate directly to Werkstatt
      await page.goto("/locations?id=1")

      // Should show location name in the header
      await expect(page.locator("h2, h3").filter({ hasText: "Werkstatt" })).toBeVisible()
    })

    test("should show items count at location", async ({ authenticatedPage: page }) => {
      // Navigate to Werkbank 1 which has items
      await page.goto("/locations?id=10")

      // Should show "Items an diesem Ort" heading with count
      await expect(page.locator("text=Items an diesem Ort")).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe("Location Hierarchy", () => {
    test("should navigate through 3 levels of hierarchy", async ({ authenticatedPage: page }) => {
      await page.goto("/locations")

      // Level 1: Root locations
      await expect(page.locator("text=Werkstatt").first()).toBeVisible()

      // Level 2: Click to go deeper
      await page.locator("text=Werkstatt").first().click()
      await expect(page).toHaveURL(/\?id=1/)
      // Use first() since there are Werkbank 1 and Werkbank 2
      await expect(page.locator("text=Werkbank").first()).toBeVisible({ timeout: 5000 })

      // Level 3: Click again to go to Werkbank 1
      await page.locator("text=Werkbank").first().click()
      // Use first() since there are Schublade 1 and Schublade 2
      await expect(page.locator("text=Schublade").first()).toBeVisible({ timeout: 5000 })
    })

    test("should show full location path", async ({ authenticatedPage: page }) => {
      // Navigate to Schublade 1 (id=100)
      await page.goto("/locations?id=100")

      // Breadcrumb should show path - Werkstatt should be in breadcrumb (use first() for multiple matches)
      await expect(page.locator("text=Werkstatt").first()).toBeVisible()
      await expect(page.locator("text=Werkbank").first()).toBeVisible()
    })
  })

  test.describe("Location Operations (Authenticated)", () => {
    test("should show location management options when authenticated", async ({ authenticatedPage: page }) => {
      await page.goto("/locations?id=1")

      // Should see image upload button (has ImagePlusIcon)
      const imageButton = page.locator('button').filter({ has: page.locator('svg') }).first()
      await expect(imageButton).toBeVisible()
    })

    test("should prevent deleting location with children", async ({ authenticatedPage: page }) => {
      // Navigate to Werkstatt which has children
      await page.goto("/locations?id=1")

      // Delete button should NOT be visible because location has children
      const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
      await expect(deleteButton).not.toBeVisible()
    })

    test("should prevent deleting location with items", async ({ authenticatedPage: page }) => {
      // Navigate to Werkbank 1 (id=10) which has items but also has children
      await page.goto("/locations?id=10")

      // Delete button should NOT be visible because location has children or items
      const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
      await expect(deleteButton).not.toBeVisible()
    })
  })

  test.describe("Location Image", () => {
    test("should display location image if present", async ({ authenticatedPage: page }) => {
      await page.goto("/locations?id=1")

      // Check for image element or placeholder (MapPinIcon)
      const locationImage = page.locator('img[alt="Werkstatt"]')
      const placeholder = page.locator('svg.lucide-map-pin')

      // Either image or placeholder should be visible
      const hasImage = await locationImage.isVisible().catch(() => false)
      const hasPlaceholder = await placeholder.first().isVisible().catch(() => false)

      expect(hasImage || hasPlaceholder).toBeTruthy()
    })
  })
})
