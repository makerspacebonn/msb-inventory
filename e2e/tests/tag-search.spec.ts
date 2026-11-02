import { expect, type Page, test } from "@playwright/test"

// Seed data: the tag "Elektro" is only on "Bohrmaschine Makita" (item 1)
// and "Akkuschrauber Bosch" ("Elektronik" is a different tag). The tag
// "Schrauben" is on "Akkuschrauber Bosch" and "Schraubenset M3"; of these,
// only the Akkuschrauber also has "Werkzeug".

const searchQuery = (page: Page) =>
  expect.poll(() => new URL(page.url()).searchParams.get("q"))

const searchFor = async (page: Page, query: string) => {
  await page.goto("/items")
  const search = page.getByRole("searchbox", { name: "Items suchen" })
  await search.fill(query)
  await search.press("Enter")
  await searchQuery(page).toBe(query)
}

const itemLink = (page: Page, name: string) =>
  page.getByRole("main").getByRole("link", { name, exact: true })

test.describe("Search by tags", () => {
  test("clicking an item's tag shows all items with that tag", async ({
    page,
  }) => {
    await page.goto("/i/1")

    await page.getByRole("link", { name: "Elektro", exact: true }).click()

    await searchQuery(page).toBe('tag:"Elektro"')
    await expect(page.getByText("Schlagwort: Elektro")).toBeVisible()
    await expect(page.getByText("2 Ergebnisse", { exact: true })).toBeVisible()
    await expect(itemLink(page, "Bohrmaschine Makita")).toBeVisible()
    await expect(itemLink(page, "Akkuschrauber Bosch")).toBeVisible()
  })

  test("clicking a further tag narrows the results to items with all tags", async ({
    page,
  }) => {
    await searchFor(page, "tag:Schrauben")
    await expect(page.getByText("2 Ergebnisse", { exact: true })).toBeVisible()

    await page
      .getByRole("navigation", { name: "Nach Schlagwort eingrenzen" })
      .getByRole("link", { name: 'Nach Schlagwort "Werkzeug" eingrenzen' })
      .click()

    await searchQuery(page).toBe('tag:"Schrauben" tag:"Werkzeug"')
    await expect(page.getByText("Schlagwort: Werkzeug")).toBeVisible()
    await expect(page.getByText("1 Ergebnis", { exact: true })).toBeVisible()
    await expect(itemLink(page, "Akkuschrauber Bosch")).toBeVisible()
    await expect(itemLink(page, "Schraubenset M3")).toHaveCount(0)
  })

  test("removes one tag filter", async ({ page }) => {
    await searchFor(page, 'tag:"Schrauben" tag:"Werkzeug"')
    await expect(page.getByText("1 Ergebnis", { exact: true })).toBeVisible()

    await page
      .getByRole("link", { name: 'Schlagwort-Filter "Werkzeug" entfernen' })
      .click()

    await searchQuery(page).toBe('tag:"Schrauben"')
    await expect(page.getByText("Schlagwort: Werkzeug")).toHaveCount(0)
    await expect(page.getByText("Schlagwort: Schrauben")).toBeVisible()
    await expect(itemLink(page, "Schraubenset M3")).toBeVisible()
  })

  test("removes all tag filters at once and keeps the rest of the search", async ({
    page,
  }) => {
    await searchFor(page, 'cat:"Elektrowerkzeug" tag:Schrauben tag:Werkzeug')
    await expect(page.getByText("Schlagwort: Schrauben")).toBeVisible()

    await page
      .getByRole("link", { name: "Alle Schlagwort-Filter entfernen" })
      .click()

    await searchQuery(page).toBe('cat:"Elektrowerkzeug"')
    await expect(page.getByText(/^Schlagwort:/)).toHaveCount(0)
    await expect(page.getByText("Kategorie: Elektrowerkzeug")).toBeVisible()
    await expect(itemLink(page, "Bohrmaschine Makita")).toBeVisible()
  })
})
