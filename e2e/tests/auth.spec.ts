import { expect, TEST_USER, test } from "../fixtures/auth.fixture"

test.describe("Session Management", () => {
  test("shows the user and a logout button when authenticated", async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByRole("banner").getByText(TEST_USER.name),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Abmelden" })).toBeEnabled()
  })

  test("logs out", async ({ logoutTestPage: page }) => {
    // Uses a dedicated session that can be invalidated without affecting
    // other parallel tests
    const banner = page.getByRole("banner")
    await expect(banner.getByText(TEST_USER.name)).toBeVisible()

    await page.getByRole("button", { name: "Abmelden" }).click()

    await expect(banner.getByRole("link", { name: "Anmelden" })).toBeVisible()
    await expect(banner.getByText(TEST_USER.name)).toHaveCount(0)
  })

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("logs out from the menu", async ({ phoneLogoutTestPage: page }) => {
      await page.getByRole("button", { name: "Menü öffnen" }).click()
      const menu = page.getByRole("dialog", { name: "Menü" })
      await expect(menu.getByText(TEST_USER.name)).toBeVisible()

      await menu.getByRole("button", { name: "Abmelden" }).click()

      await expect(
        page.getByRole("banner").getByRole("link", { name: "Item hinzufügen" }),
      ).toHaveCount(0)
      // The session is gone, also after reloading
      await page.reload()
      await page.getByRole("button", { name: "Menü öffnen" }).click()
      await expect(
        page.getByRole("dialog", { name: "Menü" }).getByRole("link", {
          name: "Anmelden",
        }),
      ).toBeVisible()
    })
  })
})
