import crypto from "node:crypto"
import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from "@playwright/test"

export const TEST_USER = {
  email: "e2e-user@example.com",
  name: "E2E Test User",
}

export type TestFixtures = {
  authenticatedPage: Page
  logoutTestPage: Page
  testUserEmail: string
}

// These tokens match the ones in scripts/seed-e2e-data.ts
// Sessions are pre-created in the database when seeding
const E2E_SESSION_TOKEN = "e2e-test-session-token-12345"
// Separate session for logout test - can be safely invalidated without affecting other tests
const E2E_LOGOUT_SESSION_TOKEN = "e2e-logout-session-token-67890"

/**
 * Sign a session token using HMAC-SHA256 with BETTER_AUTH_SECRET.
 * better-auth requires tokens to be signed in the format: {token}.{base64Signature}
 */
function signSessionToken(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || "e2e-test-secret-key-12345"
  const signature = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("base64")
  return `${token}.${signature}`
}

/**
 * Set the session cookie for the pre-seeded e2e-user.
 * This allows tests to be authenticated without going through the login UI.
 * @param token - The session token to use (defaults to main E2E session)
 */
async function setAuthCookie(
  context: BrowserContext,
  token: string = E2E_SESSION_TOKEN,
): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3001"
  const domain = new URL(baseUrl).hostname

  // Sign the token as better-auth expects
  const signedToken = signSessionToken(token)

  // Set the session cookie that better-auth expects
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(signedToken),
      domain,
      path: "/",
      httpOnly: true,
      secure: false, // Required for HTTP in test environment
      sameSite: "Lax",
      // Expires in 30 days (matches the seeded session)
      expires: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    },
  ])
}

// Counter to ensure unique emails across parallel tests (for registration tests)
let userCounter = 0

export const test = base.extend<TestFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires empty object destructuring
  testUserEmail: async ({}, use) => {
    // Generate unique email for each test using timestamp + counter
    const uniqueEmail = `e2e-test-${Date.now()}-${userCounter++}@example.com`
    await use(uniqueEmail)
  },
  authenticatedPage: async ({ page, context }, use) => {
    // Set the session cookie for the pre-seeded e2e-user
    await setAuthCookie(context)

    // Navigate and verify authentication worked by checking for user name in header
    await page.goto("/")
    await expect(page.locator("header").getByText(TEST_USER.name)).toBeVisible({
      timeout: 5000,
    })

    await use(page)
  },
  logoutTestPage: async ({ page, context }, use) => {
    // Use separate logout session token - can be safely invalidated
    // without affecting other parallel tests
    await setAuthCookie(context, E2E_LOGOUT_SESSION_TOKEN)

    // Navigate and verify authentication worked
    await page.goto("/")
    await expect(page.locator("header").getByText(TEST_USER.name)).toBeVisible({
      timeout: 5000,
    })

    await use(page)
  },
})

/**
 * Register a new user and login via the UI
 * Uses unique email to avoid conflicts in parallel tests
 * This is used by auth.spec.ts to test the actual registration flow
 */
export async function registerAndLoginViaUI(
  page: Page,
  email?: string,
): Promise<void> {
  const uniqueEmail =
    email || `e2e-test-${Date.now()}-${userCounter++}@example.com`

  await page.goto("/login")

  // Wait for login page to fully load
  await expect(page.locator("h1")).toContainText("Anmelden", { timeout: 5000 })

  // Click "Noch kein Konto? Registrieren" to switch to signup mode
  await page.locator("text=Noch kein Konto?").click()

  // Wait for signup mode to be active (Name field should appear)
  const nameInput = page.locator('input[placeholder="Name"]')
  await expect(nameInput).toBeVisible({ timeout: 5000 })

  // Fill in registration form with unique email
  await nameInput.fill(TEST_USER.name)
  await page.locator('input[placeholder="E-Mail"]').fill(uniqueEmail)
  await page
    .locator('input[placeholder="Passwort"]')
    .fill("e2e-test-password-123")
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to home
  await page.waitForURL("/", { timeout: 10000 })
}

/**
 * Login via the UI with existing credentials
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
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
  await expect(page.locator('a[href="/items/add"]')).toBeVisible({
    timeout: 5000,
  })
}

/**
 * Verify the user is logged out
 */
export async function expectLoggedOut(page: Page): Promise<void> {
  await page.goto("/items")
  await expect(page.locator('a[href="/items/add"]')).not.toBeVisible()
}

export { expect } from "@playwright/test"
