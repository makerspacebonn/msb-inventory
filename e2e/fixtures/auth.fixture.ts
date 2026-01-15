import { test as base, expect, type Page } from "@playwright/test"

const E2E_JWT_SECRET = "e2e-test-secret-key-12345"
const E2E_PASSWORD = "e2e-test-password"

/**
 * Creates an auth token in the same format as src/lib/auth.ts
 * Format: Base64(userId:JWT_SECRET:timestamp)
 */
function createAuthToken(userId: string, secret: string = E2E_JWT_SECRET): string {
  const data = `${userId}:${secret}:${Date.now()}`
  return Buffer.from(data).toString("base64")
}

export type TestFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page, context }, use) => {
    const baseURL = process.env.E2E_BASE_URL || "http://localhost:3001"
    const domain = new URL(baseURL).hostname

    await context.addCookies([
      {
        name: "auth_token",
        value: createAuthToken("admin"),
        domain,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ])
    await use(page)
  },
})

/**
 * Login via the UI (for testing the login flow itself)
 */
export async function loginViaUI(page: Page, password: string = E2E_PASSWORD): Promise<void> {
  await page.goto("/login")
  await page.locator('input[placeholder="Passwort"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL("/")
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
