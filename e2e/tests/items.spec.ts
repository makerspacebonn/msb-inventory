import { expect, type Page, test } from "@playwright/test"

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

  // Searching happens in the header; the items page shows the full results
  const searchFor = async (page: Page, query: string) => {
    const search = page.getByRole("searchbox", { name: "Items suchen" })
    await search.fill(query)
    await search.press("Enter")
    await expect(page).toHaveURL(`/items?q=${encodeURIComponent(query)}`)
  }

  test("searches items by name", async ({ page }) => {
    await searchFor(page, "Bohrmaschine")

    await expect(seededTestItems(page)).toHaveCount(0)
    await expect(
      page.getByRole("link", { name: "Bohrmaschine Makita" }),
    ).toBeVisible()
    await expect(
      page.getByText(/Ergebnis(se)? für "Bohrmaschine"/),
    ).toBeVisible()
  })

  test("searches items by manufacturer", async ({ page }) => {
    // "Thunder Laser" is only the manufacturer of the "Lasercutter"
    await searchFor(page, "Thunder")

    await expect(seededTestItems(page)).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Lasercutter" })).toBeVisible()
  })

  test("goes back from the results to all items", async ({ page }) => {
    await searchFor(page, "Bohrmaschine")
    await expect(seededTestItems(page)).toHaveCount(0)

    await page.getByRole("link", { name: "Alle Items anzeigen" }).click()

    await expect(page).toHaveURL("/items")
    await expect(page.getByText(/Ergebnis/)).toHaveCount(0)
    await expect(seededTestItems(page).first()).toBeVisible()
  })

  test("offers no own search or add button", async ({ page }) => {
    await expect(seededTestItems(page).first()).toBeVisible()

    // Both live in the header now
    await expect(page.getByRole("main").getByRole("textbox")).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("searchbox")).toHaveCount(0)
    await expect(
      page.getByRole("main").getByRole("link", { name: /Add Item/ }),
    ).toHaveCount(0)
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
    await page.goto("/items/add")

    await expect(page.getByText("Unauthorized")).toBeVisible()
  })
})
