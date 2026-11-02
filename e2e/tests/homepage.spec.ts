import { expect, test } from "@playwright/test"

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("shows title and heading", async ({ page }) => {
    await expect(page).toHaveTitle(/MSB Inventar/)
    await expect(
      page.getByRole("heading", { level: 1, name: /MakerSpace Bonn/ }),
    ).toBeVisible()
  })

  test("shows a number in every statistic", async ({ page }) => {
    for (const title of [
      "Gesamte Items",
      "Standorte",
      "Mit Bildern",
      "Neu (30 Tage)",
    ]) {
      await expect(page.getByRole("group", { name: title })).toContainText(/\d/)
    }
  })

  test("navigates to the items page", async ({ page }) => {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Items", exact: true })
      .click()

    await expect(page).toHaveURL("/items")
  })

  test("shows when the statistics were updated", async ({ page }) => {
    await expect(page.getByText(/Stand: \d{2}\.\d{2}\.\d{4}/)).toBeVisible()
  })
})
