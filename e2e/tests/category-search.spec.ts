import { expect, type Page, test } from "@playwright/test"

// Seed data: only "Bohrmaschine Makita" (item 1) and "Akkuschrauber Bosch"
// are in the category "Elektrowerkzeug". "Lötstation Weller" is in
// "Elektronik", "Oszilloskop Rigol" in "Messtechnik".

const searchQuery = (page: Page) =>
  expect.poll(() => new URL(page.url()).searchParams.get("q"))

const searchFor = async (page: Page, query: string) => {
  const search = page.getByRole("searchbox", { name: "Items suchen" })
  await search.fill(query)
  await search.press("Enter")
  await searchQuery(page).toBe(query)
}

const itemLink = (page: Page, name: string) =>
  page.getByRole("main").getByRole("link", { name, exact: true })

test.describe("Search by category", () => {
  test("clicking an item's category shows all items of that category", async ({
    page,
  }) => {
    await page.goto("/i/1")

    await page.getByRole("link", { name: "Elektrowerkzeug" }).click()

    await searchQuery(page).toBe('cat:"Elektrowerkzeug"')
    await expect(page.getByText("Kategorie: Elektrowerkzeug")).toBeVisible()
    await expect(page.getByText("2 Ergebnisse", { exact: true })).toBeVisible()
    await expect(itemLink(page, "Bohrmaschine Makita")).toBeVisible()
    await expect(itemLink(page, "Akkuschrauber Bosch")).toBeVisible()
    await expect(itemLink(page, "Lötstation Weller")).toHaveCount(0)
  })

  test("finds all matching categories with a wildcard, ignoring case", async ({
    page,
  }) => {
    await page.goto("/items")
    await searchFor(page, "cat:elektro*")

    await expect(page.getByText("Kategorie: elektro*")).toBeVisible()
    await expect(itemLink(page, "Bohrmaschine Makita")).toBeVisible()
    await expect(itemLink(page, "Lötstation Weller")).toBeVisible()
    await expect(itemLink(page, "Oszilloskop Rigol")).toHaveCount(0)
  })

  test("combines a category with search text", async ({ page }) => {
    await page.goto("/items")
    await searchFor(page, 'cat:"Elektrowerkzeug" bosch')

    await expect(page.getByText('1 Ergebnis für "bosch"')).toBeVisible()
    await expect(page.getByText("Kategorie: Elektrowerkzeug")).toBeVisible()
    await expect(itemLink(page, "Akkuschrauber Bosch")).toBeVisible()
    await expect(itemLink(page, "Bohrmaschine Makita")).toHaveCount(0)
  })

  test("removing the category filter keeps the search text", async ({
    page,
  }) => {
    await page.goto("/items")
    await searchFor(page, 'cat:"Elektrowerkzeug" bosch')
    await expect(page.getByText("Kategorie: Elektrowerkzeug")).toBeVisible()

    await page
      .getByRole("link", {
        name: 'Kategorie-Filter "Elektrowerkzeug" entfernen',
      })
      .click()

    await searchQuery(page).toBe("bosch")
    await expect(page.getByText(/Ergebnis(se)? für "bosch"/)).toBeVisible()
    await expect(page.getByText("Kategorie: Elektrowerkzeug")).toHaveCount(0)
  })
})
