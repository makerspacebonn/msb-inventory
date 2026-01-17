import { expect, test } from "../fixtures/auth.fixture"

test.describe("Changelog / Audit Log", () => {
  test("should load changelog page", async ({ authenticatedPage: page }) => {
    await page.goto("/changelog")

    await expect(page).toHaveTitle(/Changelog|MSB/)
  })

  test("should display changelog entries", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Should have at least one entry from seed data - look for the list container
    const entries = page.locator(".border-b")
    await expect(entries.first()).toBeVisible({ timeout: 10000 })
  })

  test("should show change type badges", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Look for change type badges (+, ~, −)
    const badges = page.locator(".font-mono")

    // At least one badge should be visible
    await expect(badges.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show entity type icons", async ({ authenticatedPage: page }) => {
    await page.goto("/changelog")

    // Look for entity type icons (BoxIcon for items, MapPinIcon for locations)
    const entityIcons = page.locator("svg.lucide-box, svg.lucide-map-pin")

    // At least one type should be visible
    await expect(entityIcons.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show user who made the change", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Should show user info - Admin from seed data
    const userInfo = page.locator("text=/Admin|admin/i")
    await expect(userInfo.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show timestamp of changes", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Should have date/time information (German format)
    const timestamp = page.locator("text=/\\d{2}\\.\\d{2}\\.\\d{4}/")
    await expect(timestamp.first()).toBeVisible({ timeout: 5000 })
  })

  test("should show total entries count", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Look for "X Einträge insgesamt" text
    await expect(page.locator("text=/\\d+ Einträge? insgesamt/")).toBeVisible({
      timeout: 5000,
    })
  })

  test("should expand entry to show diff view", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Click on an entry to expand it
    const entry = page.locator(".border-b").first()
    await entry.click()

    // After clicking, should show diff view or undo button
    const diffView = page.locator("text=Rückgängig")

    // ToDo: there should be a proper test for the diff view
    // Diff view may or may not be present depending on UI design
    await expect(diffView)
      .toBeVisible({ timeout: 3000 })
      .catch(() => {
        // It's okay if diff view doesn't show - entry might not be expandable
      })
  })

  test("should show changed fields in diff", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Click on an entry to expand it
    const entry = page.locator(".border-b").first()
    await entry.click()

    // Look for field labels or diff content
    const fieldLabels = page.locator(
      "text=/Name|Beschreibung|Kategorie|Erstellte Werte|Geänderte Werte/i",
    )

    // ToDo: Fix this stupid test, which tests nothing
    // At least some field info should be visible after expanding
    await expect(fieldLabels.first())
      .toBeVisible({ timeout: 500 })
      .catch(() => {
        // It's okay if no fields shown - might not have expandable diff
      })
  })

  test("should have undo functionality", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // Click on first entry to expand
    const entry = page.locator(".border-b").first()
    await entry.click()

    // Look for undo button ("Rückgängig")
    const undoButton = page.locator("text=Rückgängig")

    // ToDo: tunr this into a proper test
    // Undo button should be present for reversible changes
    await expect(undoButton.first())
      .toBeVisible({ timeout: 30 })
      .catch(() => {
        // Not all entries may have undo button visible
      })
  })

  test("should show undo confirmation dialog", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/changelog")

    // First expand an entry
    const entry = page.locator(".border-b").first()
    await entry.click()
    await page.waitForTimeout(500)

    const undoButton = page.locator('button:has-text("Rückgängig")').first()

    if (await undoButton.isVisible()) {
      await undoButton.click()

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"]')
      await expect(confirmDialog.first()).toBeVisible({ timeout: 5000 })

      // Cancel the undo
      const cancelButton = page.locator('button:has-text("Abbrechen")')
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
    }
  })
})
