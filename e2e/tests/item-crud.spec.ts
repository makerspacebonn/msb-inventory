import { test, expect } from "../fixtures/auth.fixture"

test.describe("Item CRUD Operations", () => {
  test.describe("Create Item", () => {
    test("should navigate to add item page when authenticated", async ({ authenticatedPage: page }) => {
      await page.goto("/items")

      const addButton = page.locator('a[href="/items/add"]')
      await expect(addButton).toBeVisible()

      await addButton.click()
      await expect(page).toHaveURL("/items/add")
    })

    test("should display item form", async ({ authenticatedPage: page }) => {
      await page.goto("/items/add")

      await expect(page.locator('input[name="name"]')).toBeVisible()
    })

    test("should require item name", async ({ authenticatedPage: page }) => {
      await page.goto("/items/add")

      const submitButton = page.locator('button:has-text("Erstellen")')
      await expect(submitButton).toBeVisible()
      await submitButton.click()

      // Form should still be on the same page (validation prevents navigation)
      await expect(page).toHaveURL(/\/items\/add/)
    })

    test("should create new item", async ({ authenticatedPage: page }) => {
      await page.goto("/items/add")

      const testItemName = `E2E Test Item ${Date.now()}`

      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toBeVisible()
      await nameInput.fill(testItemName)

      await page.locator('button:has-text("Erstellen")').click()

      // Should redirect to item detail page
      await page.waitForURL(/\/i\/\d+/)

      await expect(page.locator("h1").first()).toContainText(testItemName)
    })
  })

  test.describe("Edit Item", () => {
    test("should show edit button on item detail when authenticated", async ({ authenticatedPage: page }) => {
      await page.goto("/i/1")

      const editButton = page.locator('text=Bearbeiten')
      await expect(editButton.first()).toBeVisible()
    })

    test("should navigate to edit form", async ({ authenticatedPage: page }) => {
      await page.goto("/i/1")

      const editButton = page.locator('text=Bearbeiten')
      await editButton.first().click()

      await expect(page).toHaveURL(/\/items\/add\?itemId=1/)
    })

    test("should pre-fill form with existing data", async ({ authenticatedPage: page }) => {
      await page.goto("/items/add?itemId=1")

      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toHaveValue(/Bohrmaschine/)
    })

    test("should save edited item", async ({ authenticatedPage: page }) => {
      await page.goto("/items/add?itemId=2") // Edit Lötstation

      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toBeVisible()
      await expect(nameInput).not.toHaveValue("")

      const originalName = await nameInput.inputValue()

      const modifiedName = `${originalName} (edited)`
      await nameInput.clear()
      await nameInput.fill(modifiedName)

      // Edit mode uses "Speichern" button
      await page.locator('button:has-text("Speichern")').click()

      await page.waitForURL(/\/i\/\d+/)

      await expect(page.locator("h1").first()).toContainText("edited")

      // Revert the change for other tests
      await page.goto("/items/add?itemId=2")
      const revertInput = page.locator('input[name="name"]')
      await expect(revertInput).toBeVisible()
      await revertInput.clear()
      await revertInput.fill(originalName)
      await page.locator('button:has-text("Speichern")').click()
      await page.waitForURL(/\/i\/\d+/)
    })
  })

  test.describe("Delete Item", () => {
    test("should show delete button when authenticated", async ({ authenticatedPage: page }) => {
      await page.goto("/i/1")

      const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
      await expect(deleteButton.first()).toBeVisible()
    })

    test("should require confirmation before deleting", async ({ authenticatedPage: page }) => {
      // Create a test item to delete
      await page.goto("/items/add")

      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toBeVisible()

      const testItemName = `Delete Test ${Date.now()}`
      await nameInput.fill(testItemName)
      await page.locator('button:has-text("Erstellen")').click()

      await page.waitForURL(/\/i\/\d+/)

      const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
      await expect(deleteButton.first()).toBeVisible()
      await deleteButton.first().click()

      // Should show confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Cancel
      await page.locator('button:has-text("Abbrechen")').click()
    })

    test("should delete item after confirmation", async ({ authenticatedPage: page }) => {
      // Create a test item to delete
      await page.goto("/items/add")

      const nameInput = page.locator('input[name="name"]')
      await expect(nameInput).toBeVisible()

      const testItemName = `Delete Me ${Date.now()}`
      await nameInput.fill(testItemName)
      await page.locator('button:has-text("Erstellen")').click()

      await page.waitForURL(/\/i\/\d+/)
      const itemUrl = page.url()
      const itemId = itemUrl.match(/\/i\/(\d+)/)?.[1]

      const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
      await expect(deleteButton.first()).toBeVisible()
      await deleteButton.first().click()

      await expect(page.locator('[role="dialog"]')).toBeVisible()

      const confirmButton = page.locator('[role="dialog"] button:has-text("Löschen")')
      await confirmButton.click()

      // Should redirect to items list
      await page.waitForURL("/items")

      // Item should no longer exist
      if (itemId) {
        const response = await page.goto(`/i/${itemId}`)
        const is404 = response?.status() === 404
        const hasNoContent = await page.locator("h1").count() === 0

        expect(is404 || hasNoContent).toBeTruthy()
      }
    })
  })
})
