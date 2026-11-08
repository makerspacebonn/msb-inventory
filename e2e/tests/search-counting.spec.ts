import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

// Runs in its own project after the other tests, as it compares exact
// numbers: nothing else may search meanwhile
test.describe.configure({ mode: "serial" })

/** Searches counted in the last 7 days, as the statistics page shows them */
async function countedSearches(page: Page) {
  await page.goto("/stats?days=7")
  const tile = page
    .getByRole("list", { name: /^Summen der letzten/ })
    .getByRole("listitem")
    .filter({ has: page.getByText("Suchen", { exact: true }) })
  const text = await tile.locator("div").nth(1).textContent()
  const count = Number(text?.replace(/\./g, ""))
  expect(Number.isNaN(count)).toBe(false)
  return count
}

/** Waits for the request that counts a search, the only POST it causes */
const countRequest = (page: Page) =>
  page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().includes("/_serverFn/"),
  )

const results = (page: Page) => page.getByText(/^\d+ Ergebnis/)

test.describe("Counting searches", () => {
  test("opening, reloading or narrowing a results page doesn't count", async ({
    page,
  }) => {
    const before = await countedSearches(page)

    // What a crawler or the browser does on its own
    await page.goto("/items?q=Bohrmaschine")
    await expect(results(page)).toBeVisible()
    await page.reload()
    await expect(results(page)).toBeVisible()
    await page.goto("/items?q=Werkzeug")
    await page
      .getByRole("navigation", { name: "Nach Schlagwort eingrenzen" })
      .getByRole("link")
      .first()
      .click()
    await expect(page).toHaveURL(/q=.*tag/)

    expect(await countedSearches(page)).toBe(before)
  })

  test("counts a search from the header once, also after going back", async ({
    page,
  }) => {
    const before = await countedSearches(page)

    await page.goto("/")
    const counted = countRequest(page)
    await page.getByRole("searchbox", { name: "Items suchen" }).fill("Akku")
    await page.getByRole("searchbox", { name: "Items suchen" }).press("Enter")
    await counted
    await expect(page).toHaveURL(/\/items\?q=Akku/)

    await page.reload()
    await page.goBack()
    await page.goForward()
    await expect(results(page)).toBeVisible()

    expect(await countedSearches(page)).toBe(before + 1)
  })

  test("counts a click on an item's tag", async ({ page }) => {
    const before = await countedSearches(page)

    // Seed item 1, "Bohrmaschine Makita", has the tag "Werkzeug"
    await page.goto("/i/1")
    const counted = countRequest(page)
    await page.getByRole("link", { name: "Werkzeug", exact: true }).click()
    await counted
    await expect(results(page)).toBeVisible()

    expect(await countedSearches(page)).toBe(before + 1)
  })
})
