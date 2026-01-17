import { test as base, expect, type Page } from "@playwright/test"

export const TEST_USER = {
  email: "e2e-test@example.com",
  password: "e2e-test-password-123",
  name: "E2E Test User",
}

export type TestFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await registerAndLoginViaUI(page)
    await use(page)
  },
})

/**
 * Register a new user and login via the UI
 */
export async function registerAndLoginViaUI(page: Page): Promise<void> {
  await page.goto("/login")

  // Click "Noch kein Konto? Registrieren" to switch to signup mode
  await page.locator("text=Noch kein Konto?").click()

  // Fill in registration form
  await page.locator('input[placeholder="Name"]').fill(TEST_USER.name)
  await page.locator('input[placeholder="E-Mail"]').fill(TEST_USER.email)
  await page.locator('input[placeholder="Passwort"]').fill(TEST_USER.password)
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to home
  await page.waitForURL("/", { timeout: 10000 })
}

/**
 * Login via the UI with existing credentials
 */
export async function loginViaUI(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password,
): Promise<void> {
  await page.goto("/login")
  await page.locator('input[placeholder="E-Mail"]').fill(email)
  await page.locator('input[placeholder="Passwort"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("/", { timeout: 10000 })
}

/**
 * Verify the user is logged in by checking for auth-dependent UI elements
 */
export async function expectLoggedIn(page: Page): Promise<void> {
  // When logged in, the "Add Item" button should be visible on items page
  await page.goto("/items")
  await expect(page.locator('a[href="/items/add"]')).toBeVisible()
}

/**
 * Verify the user is logged out
 */
export async function expectLoggedOut(page: Page): Promise<void> {
  await page.goto("/items")
  await expect(page.locator('a[href="/items/add"]')).not.toBeVisible()
}

export { expect } from "@playwright/test"
