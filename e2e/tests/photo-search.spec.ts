import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "../fixtures/auth.fixture"

// In the E2E environment the AI answer is fixed (GEMINI_STUB_RESPONSE in
// docker-compose.e2e.yml): every photo is recognized as an "Akkuschrauber"
// by Bosch in "Elektrowerkzeug", tagged Werkzeug, Schrauben and Elektro.
// In the seed data, "Akkuschrauber Bosch" matches all of that.
const photo = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/photo-search.jpg",
)

test.describe("Search by photo", () => {
  test("finds matching items for a photo, best match first", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items")
    await page.getByRole("link", { name: "Mit Foto suchen" }).click()
    await expect(
      page.getByRole("heading", { name: "Mit Foto suchen" }),
    ).toBeVisible()

    await page.getByLabel("Foto für die Suche").setInputFiles(photo)

    await expect(page.getByText("Erkannt:")).toBeVisible()
    await expect(page.getByText("Akkuschrauber", { exact: true })).toBeVisible()
    await expect(
      page.getByText(/passende Items?, beste Treffer zuerst/),
    ).toBeVisible()
    await expect(
      page.getByRole("main").getByRole("listitem").first(),
    ).toContainText("Akkuschrauber Bosch")
    // Unrelated items aren't listed
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: "Filament PLA Schwarz" }),
    ).toHaveCount(0)
  })

  test("isn't offered to visitors", async ({ page }) => {
    await page.goto("/items")
    await expect(
      page.getByRole("searchbox", { name: "Items suchen" }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Mit Foto suchen" }),
    ).toHaveCount(0)

    await page.goto("/items/photo")
    await expect(page.getByText("Unauthorized")).toBeVisible()
  })
})
