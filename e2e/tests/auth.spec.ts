import { expect } from "@playwright/test"
import { test as authenticatedTest, TEST_USER } from "../fixtures/auth.fixture"

authenticatedTest.describe("Session Management", () => {
  authenticatedTest(
    "should show logout button when authenticated",
    async ({ authenticatedPage: page }) => {
      // Verify we're logged in by checking user name in header
      await expect(
        page.locator("header").getByText(TEST_USER.name),
      ).toBeVisible()

      // Verify logout button is visible and enabled
      const logoutButton = page
        .locator("button")
        .filter({ has: page.locator("svg.lucide-log-out") })
      await expect(logoutButton).toBeVisible()
      await expect(logoutButton).toBeEnabled()
    },
  )

  authenticatedTest(
    "should logout successfully",
    async ({ logoutTestPage: page }) => {
      // This test uses a dedicated session token that can be safely invalidated
      // without affecting other parallel tests

      // Verify we're logged in
      await expect(
        page.locator("header").getByText(TEST_USER.name),
      ).toBeVisible()

      // Find and click logout button
      const logoutButton = page
        .locator("button")
        .filter({ has: page.locator("svg.lucide-log-out") })
      await expect(logoutButton).toBeVisible()
      await logoutButton.click()

      // Should see login button instead of user name
      await expect(page.locator('a[href="/login"]')).toBeVisible()
    },
  )
})
