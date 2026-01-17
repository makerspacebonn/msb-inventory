import { expect, test } from "@playwright/test"
import {
  test as authenticatedTest,
  expectLoggedIn,
  expectLoggedOut,
  registerAndLoginViaUI,
  TEST_USER,
} from "../fixtures/auth.fixture"

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login page with email and password fields", async ({
      page,
    }) => {
      await page.goto("/login")

      await expect(page).toHaveTitle(/Login/)
      await expect(page.locator("h1")).toContainText("Anmelden")
      await expect(page.locator('input[placeholder="E-Mail"]')).toBeVisible()
      await expect(page.locator('input[placeholder="Passwort"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test("should hide Authentik OAuth button when not configured", async ({
      page,
    }) => {
      await page.goto("/login")

      // Authentik button should not be visible when not configured in e2e environment
      await expect(
        page.locator("text=Mit Authentik anmelden"),
      ).not.toBeVisible()
    })

    test("should toggle between login and signup modes", async ({ page }) => {
      await page.goto("/login")

      // Should start in login mode
      await expect(page.locator("h1")).toContainText("Anmelden")
      await expect(page.locator('input[placeholder="Name"]')).not.toBeVisible()

      // Click to switch to signup mode
      await page.locator("text=Noch kein Konto?").click()

      // Should now be in signup mode
      await expect(page.locator("h1")).toContainText("Registrieren")
      await expect(page.locator('input[placeholder="Name"]')).toBeVisible()

      // Click to switch back to login mode
      await page.locator("text=Bereits registriert?").click()

      // Should be back in login mode
      await expect(page.locator("h1")).toContainText("Anmelden")
      await expect(page.locator('input[placeholder="Name"]')).not.toBeVisible()
    })
  })

  test.describe("Email/Password Authentication", () => {
    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login")

      await page
        .locator('input[placeholder="E-Mail"]')
        .fill("invalid@example.com")
      await page.locator('input[placeholder="Passwort"]').fill("wrong-password")
      await page.locator('button[type="submit"]').click()

      // Should show error message
      await expect(page.locator(".text-destructive")).toBeVisible({
        timeout: 5000,
      })
    })

    test("should register new user successfully", async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`

      await page.goto("/login")

      // Switch to signup mode
      await page.locator("text=Noch kein Konto?").click()

      // Fill in registration form
      await page.locator('input[placeholder="Name"]').fill("Test User")
      await page.locator('input[placeholder="E-Mail"]').fill(uniqueEmail)
      await page
        .locator('input[placeholder="Passwort"]')
        .fill("test-password-123")
      await page.locator('button[type="submit"]').click()

      // Should redirect to home
      await expect(page).toHaveURL("/", { timeout: 10000 })
    })

    test("should login with valid credentials after registration", async ({
      page,
    }) => {
      const uniqueEmail = `login-test-${Date.now()}@example.com`
      const password = "login-test-password-123"

      // First register
      await page.goto("/login")
      await page.locator("text=Noch kein Konto?").click()
      await page.locator('input[placeholder="Name"]').fill("Login Test User")
      await page.locator('input[placeholder="E-Mail"]').fill(uniqueEmail)
      await page.locator('input[placeholder="Passwort"]').fill(password)
      await page.locator('button[type="submit"]').click()
      await expect(page).toHaveURL("/", { timeout: 10000 })

      // Logout (click logout button)
      const logoutButton = page
        .locator("button")
        .filter({ has: page.locator("svg.lucide-log-out") })
      await logoutButton.click()

      // Now login with the same credentials
      await page.goto("/login")
      await page.locator('input[placeholder="E-Mail"]').fill(uniqueEmail)
      await page.locator('input[placeholder="Passwort"]').fill(password)
      await page.locator('button[type="submit"]').click()

      // Should redirect to home
      await expect(page).toHaveURL("/", { timeout: 10000 })
    })
  })

  test.describe("Session Management", () => {
    test("should persist auth state across navigation", async ({ page }) => {
      await registerAndLoginViaUI(page)

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
      await registerAndLoginViaUI(page)

      // Find and click logout button (has LogOutIcon)
      const logoutButton = page
        .locator("button")
        .filter({ has: page.locator("svg.lucide-log-out") })
      await expect(logoutButton).toBeVisible()
      await logoutButton.click()

      // Should no longer see authenticated UI elements
      await page.goto("/items")
      await expect(page.locator('a[href="/items/add"]')).not.toBeVisible()
    })

    authenticatedTest(
      "should show user info in header when logged in",
      async ({ authenticatedPage: page }) => {
        // User name or email should be visible in header
        await expect(
          page.locator("header").locator(`text=${TEST_USER.name}`),
        ).toBeVisible()
      },
    )
  })

  test.describe("Auth-Protected Features", () => {
    authenticatedTest(
      "should show Add Item button when authenticated",
      async ({ authenticatedPage: page }) => {
        await expectLoggedIn(page)
      },
    )

    test("should hide Add Item button when not authenticated", async ({
      page,
    }) => {
      await expectLoggedOut(page)
    })
  })
})
