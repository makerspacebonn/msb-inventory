import { expect, test } from "../fixtures/auth.fixture"

// Seed data: "Test Item 30" lives in "Regal A" (Lager → Regal A),
// "Test Item 35" lives in "Fach A2" (Lager → Regal A → Fach A2)
test.describe("Item Location Picker", () => {
  test("should start at the item's current location", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/30/location/add")

    await expect(
      page.locator("h2").filter({ hasText: "Regal A" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Hier ablegen" }),
    ).toBeVisible()
  })

  test("should keep the position in the URL when opening a sublocation", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/30/location/add")

    await page.getByRole("button", { name: "Fach A1" }).click()

    await expect(page).toHaveURL(/at=200/)
    await expect(
      page.locator("h2").filter({ hasText: "Fach A1" }),
    ).toBeVisible()
  })

  test("should show the real path after opening a search result", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/30/location/add")

    await page.getByPlaceholder("Location suchen...").fill("Werkbank 2")
    await page.getByRole("button", { name: /Werkbank 2/ }).click()

    await expect(page).toHaveURL(/at=11/)
    // Breadcrumb is Start → Werkstatt → Werkbank 2, not appended to Regal A
    await expect(page.getByRole("button", { name: "Werkstatt" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Regal A" })).toHaveCount(0)
  })

  test("should save the location directly when it has no image", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/35/location/add?at=11")

    await page.getByRole("button", { name: "Hier ablegen" }).click()

    await expect(page).toHaveURL(/\/i\/35$/)
    await expect(page.locator("text=Werkbank 2").first()).toBeVisible()
  })
})
