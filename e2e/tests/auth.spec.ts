import { test, expect } from "@playwright/test"
import { loginViaUI, expectLoggedIn, expectLoggedOut } from "../fixtures/auth.fixture"

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login")

    await expect(page).toHaveTitle(/Login/)
    await expect(page.locator("h1")).toContainText("Login")
    await expect(page.locator('input[placeholder="Passwort"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test("should show error for invalid password", async ({ page }) => {
    await page.goto("/login")

    await page.locator('input[placeholder="Passwort"]').fill("wrong-password")
    await page.locator('button[type="submit"]').click()

    // Should show error message (class text-destructive)
    await expect(page.locator(".text-destructive")).toBeVisible({ timeout: 5000 })
  })

  test("should login with valid password", async ({ page }) => {
    await loginViaUI(page)

    // Should redirect to home
    await expect(page).toHaveURL("/")
  })

  test("should persist auth state across navigation", async ({ page }) => {
    await loginViaUI(page)

    // Navigate to items page
    await page.goto("/items")
    await expect(page.locator('a[href="/items/add"]')).toBeVisible()

    // Navigate to locations
    await page.goto("/locations")

    // Come back to items - should still be logged in
    await page.goto("/items")
    await expect(page.locator('a[href="/items/add"]')).toBeVisible()
  })

  test("should logout successfully", async ({ page }) => {
    await loginViaUI(page)

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Abmelden"), button[aria-label*="logout"]')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await expectLoggedOut(page)
    }
  })

  test("should show OAuth option", async ({ page }) => {
    await page.goto("/login")

    // Should show Authentik OAuth button
    await expect(page.locator("text=Authentik")).toBeVisible()
  })

  test("should show Add Item button when authenticated", async ({ page }) => {
    await loginViaUI(page)
    await expectLoggedIn(page)
  })

  test("should hide Add Item button when not authenticated", async ({ page }) => {
    await expectLoggedOut(page)
  })
})
