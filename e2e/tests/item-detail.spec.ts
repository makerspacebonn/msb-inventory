import { test, expect } from "@playwright/test"

test.describe("Item Detail Page", () => {
  test("should load item detail page", async ({ page }) => {
    // Item ID 1 is "Bohrmaschine Makita" from seed data
    await page.goto("/i/1")

    // Use first() since location names also use h1
    await expect(page.locator("h1").first()).toContainText("Bohrmaschine")
  })

  test("should display item information", async ({ page }) => {
    await page.goto("/i/1")

    // Check for manufacturer in AdditionalInfo component
    await expect(page.locator("text=Hersteller")).toBeVisible()
    // Use first() since Makita appears in title and manufacturer
    await expect(page.locator("text=Makita").first()).toBeVisible()
  })

  test("should display item description", async ({ page }) => {
    await page.goto("/i/1")

    await expect(page.locator("text=Schlagbohrmaschine")).toBeVisible()
  })

  test("should display tags", async ({ page }) => {
    await page.goto("/i/1")

    // Check for tags - item 1 has tags: ["Werkzeug", "Elektro", "Bohren"]
    await expect(page.locator("text=Werkzeug").first()).toBeVisible()
  })

  test("should display location breadcrumb", async ({ page }) => {
    await page.goto("/i/1")

    // Item 1 is in location 100 (Schublade 1 -> Werkbank 1 -> Werkstatt)
    await expect(page.locator("text=Werkstatt").first()).toBeVisible()
  })

  test("should display QR code section", async ({ page }) => {
    await page.goto("/i/1")

    // QR code component exists - look for the QR container or related text
    await expect(page.locator("text=QR")).toBeVisible()
  })

  test("should handle non-existent item gracefully", async ({ page }) => {
    const response = await page.goto("/i/99999")

    // App returns null for non-existent items
    const is404 = response?.status() === 404
    const hasNoContent = await page.locator("h1").count() === 0

    expect(is404 || hasNoContent).toBeTruthy()
  })

  test("should not show edit button when unauthenticated", async ({ page }) => {
    await page.goto("/i/1")

    const editButton = page.locator('text=Bearbeiten')
    await expect(editButton).not.toBeVisible()
  })
})
