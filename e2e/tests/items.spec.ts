import { expect, type Page, test } from "@playwright/test"

const SEARCH_PLACEHOLDER = /^Suchen nach/

// Seed items 11-35 are named "Test Item N". The first page shows 24 of the
// newest items, so some of them are always visible, even when other tests
// have added items in parallel.
const seededTestItems = (page: Page) =>
  page.getByRole("link", { name: /^Test Item \d+$/ })

test.describe("Items Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/items")
  })

  test("lists items", async ({ page }) => {
    await expect(page).toHaveTitle(/Items/)
    await expect(seededTestItems(page).first()).toBeVisible()
  })

  // The search results replace the list asynchronously, so each test first
  // waits for the unrelated items to disappear before checking the matches.

  test("searches items by name", async ({ page }) => {
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill("Bohrmaschine")

    await expect(seededTestItems(page)).toHaveCount(0)
    await expect(
      page.getByRole("link", { name: "Bohrmaschine Makita" }),
    ).toBeVisible()
  })

  test("searches items by manufacturer", async ({ page }) => {
    // "Thunder Laser" is only the manufacturer of the "Lasercutter"
    await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill("Thunder")

    await expect(seededTestItems(page)).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Lasercutter" })).toBeVisible()
  })

  test("clears the search", async ({ page }) => {
    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchInput.fill("Bohrmaschine")
    await expect(seededTestItems(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Suche leeren" }).click()

    await expect(searchInput).toHaveValue("")
    await expect(page.getByText(/Ergebnis/)).toHaveCount(0)
    await expect(seededTestItems(page).first()).toBeVisible()
  })

  test("opens an item from the list", async ({ page }) => {
    const link = seededTestItems(page).first()
    // textContent also contains hidden placeholder text, so extract the name
    const name = (await link.textContent())?.match(/Test Item \d+/)?.[0]

    await link.click()

    await expect(page).toHaveURL(/\/i\/\d+$/)
    await expect(
      page.getByRole("heading", { level: 1, name: name ?? "", exact: true }),
    ).toBeVisible()
  })

  test("requires authentication to add items", async ({ page }) => {
    await page.getByRole("link", { name: "Item hinzufügen" }).click()

    await expect(page).toHaveURL("/items/add")
    await expect(page.getByText("Unauthorized")).toBeVisible()
  })
})
