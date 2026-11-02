import { expect, test } from "@playwright/test"

// Seed: Werkstatt (1) → Werkbank 1 (10) → Schublade 1 (100);
// root locations are Werkstatt, Lager and Büro
test.describe("Locations Page", () => {
  test("shows the root locations", async ({ page }) => {
    await page.goto("/locations")

    for (const name of ["Werkstatt", "Lager", "Büro"]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible()
    }
  })

  test("navigates down three levels of the hierarchy", async ({ page }) => {
    await page.goto("/locations")

    await page.getByRole("button", { name: "Werkstatt", exact: true }).click()
    await expect(page).toHaveURL("/locations?id=1")
    await expect(
      page.getByRole("heading", { name: "Werkstatt", exact: true }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Werkbank 1", exact: true }).click()
    await expect(page).toHaveURL("/locations?id=10")
    await expect(
      page.getByRole("heading", { name: "Werkbank 1", exact: true }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Schublade 1", exact: true }).click()
    await expect(page).toHaveURL("/locations?id=100")
    await expect(
      page.getByRole("heading", { name: "Schublade 1", exact: true }),
    ).toBeVisible()
  })

  test("shows the path to the current location", async ({ page }) => {
    await page.goto("/locations?id=100")

    // The breadcrumb offers every level above the current location
    for (const name of ["Start", "Werkstatt", "Werkbank 1"]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible()
    }
  })

  test("navigates back via the breadcrumb", async ({ page }) => {
    await page.goto("/locations?id=100")

    await page.getByRole("button", { name: "Werkstatt", exact: true }).click()
    await expect(page).toHaveURL("/locations?id=1")

    await page.getByRole("button", { name: "Start", exact: true }).click()
    await expect(page).toHaveURL("/locations")
    await expect(
      page.getByRole("button", { name: "Lager", exact: true }),
    ).toBeVisible()
  })

  test("shows the items stored at a location", async ({ page }) => {
    // Schublade 1 holds the Bohrmaschine (item 1) among others
    await page.goto("/locations?id=100")

    await expect(
      page.getByRole("heading", { name: /^Items an diesem Ort \(\d+\)$/ }),
    ).toBeVisible()
    await page.getByRole("link", { name: /Bohrmaschine Makita/ }).click()
    await expect(page).toHaveURL("/i/1")
  })

  test("shows when a location holds no items", async ({ page }) => {
    // Büro has neither sublocations nor items
    await page.goto("/locations?id=3")

    await expect(
      page.getByRole("heading", { name: "Items an diesem Ort (0)" }),
    ).toBeVisible()
    await expect(page.getByText("Keine Items an diesem Ort")).toBeVisible()
  })
})
