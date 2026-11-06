import type { Page } from "@playwright/test"
import { expect, TEST_USER, test } from "../fixtures/auth.fixture"

// Other tests search and change data in parallel, so the checks compare
// totals before and after with "at least", never exact numbers

async function total(page: Page, label: string) {
  const tile = page
    .getByRole("list", { name: /^Summen der letzten/ })
    .getByRole("listitem")
    .filter({ has: page.getByText(label, { exact: true }) })
  const text = await tile.locator("div").nth(1).textContent()
  return Number(text?.replace(/\./g, ""))
}

test.describe("Activity statistics", () => {
  test("counts searches on the results page", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/stats?days=7")
    const before = await total(page, "Suchen")
    expect(Number.isNaN(before)).toBe(false)

    await page.goto("/items?q=Bohrmaschine")
    await expect(
      page.getByRole("link", { name: /Bohrmaschine Makita/ }).first(),
    ).toBeVisible()

    await page.goto("/stats?days=7")
    expect(await total(page, "Suchen")).toBeGreaterThanOrEqual(before + 1)
  })

  test("counts an added item, also for the person who added it", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/stats?days=7")
    const before = await total(page, "Hinzugefügt")

    await page.goto("/items/add")
    await page.getByLabel("Name", { exact: true }).fill(`Stats ${Date.now()}`)
    await page.getByRole("button", { name: "Erstellen" }).click()
    await expect(page).toHaveURL(/\/i\/\d+$/)

    await page.goto("/stats?days=7")
    expect(await total(page, "Hinzugefügt")).toBeGreaterThanOrEqual(before + 1)

    const people = page.getByRole("table", {
      name: "Änderungen pro Person in den letzten 7 Tagen",
    })
    const row = people.getByRole("row", { name: new RegExp(TEST_USER.name) })
    await expect(row).toBeVisible()
  })

  test("switches the period and shows each day in the table", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/stats")
    const period = page.getByRole("navigation", { name: "Zeitraum" })
    await expect(period.getByRole("link", { name: "30 Tage" })).toHaveAttribute(
      "aria-current",
      "page",
    )

    await period.getByRole("link", { name: "7 Tage" }).click()
    await expect(page).toHaveURL(/days=7/)

    const chart = page.getByRole("figure", { name: "Änderungen pro Tag" })
    await chart.getByText("Als Tabelle anzeigen").click()
    const table = chart.getByRole("table", { name: "Änderungen pro Tag" })
    // A header row and one row per day
    await expect(table.getByRole("row")).toHaveCount(8)
  })

  test("lets the keyboard step through the days", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/stats?days=7")
    const slider = page.getByRole("slider", {
      name: "Änderungen pro Tag, Tag wählen",
    })

    await slider.focus()
    // Starts at today, with all three values of the day
    await expect(slider).toHaveAttribute("aria-valuenow", "6")
    await expect(slider).toHaveAttribute(
      "aria-valuetext",
      /\d+ Hinzugefügt, \d+ Geändert, \d+ Gelöscht$/,
    )

    await slider.press("ArrowLeft")
    await expect(slider).toHaveAttribute("aria-valuenow", "5")
    await slider.press("Home")
    await expect(slider).toHaveAttribute("aria-valuenow", "0")
  })

  test("shows visitors the activity, but not who did what", async ({
    page,
  }) => {
    await page.goto("/stats?days=7")
    await expect(page.getByRole("heading", { name: "Aktivität" })).toBeVisible()
    await expect(
      page.getByRole("figure", { name: "Änderungen pro Tag" }),
    ).toBeVisible()
    // The totals have loaded, so the missing table means something
    expect(Number.isNaN(await total(page, "Hinzugefügt"))).toBe(false)
    await expect(
      page.getByRole("heading", { name: "Änderungen pro Person" }),
    ).toHaveCount(0)
    await expect(page.getByText(TEST_USER.name)).toHaveCount(0)
  })

  test("shows logged-in users who did what", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/stats?days=7")
    await expect(
      page.getByRole("heading", { name: "Änderungen pro Person" }),
    ).toBeVisible()
  })

  test("counts each person's views of an item once per hour", async ({
    authenticatedPage: page,
    browser,
  }) => {
    // A new item, so all of its views happen in this test
    const name = `Viewed ${Date.now()}`
    await page.goto("/items/add")
    await page.getByLabel("Name", { exact: true }).fill(name)
    await page.getByRole("button", { name: "Erstellen" }).click()
    await expect(page).toHaveURL(/\/i\/\d+$/)
    const itemUrl = page.url()

    // The creator opened it once; reloading doesn't add views
    for (let i = 0; i < 10; i++) {
      await page.reload()
    }

    // Four visitors, told apart by their browser, each look twice
    for (let i = 1; i <= 4; i++) {
      const visitor = await browser.newContext({
        userAgent: `E2E Visitor ${i} ${Date.now()}`,
      })
      const visitorPage = await visitor.newPage()
      for (let visit = 0; visit < 2; visit++) {
        await visitorPage.goto(itemUrl)
        await expect(
          visitorPage.getByRole("heading", { level: 1, name, exact: true }),
        ).toBeVisible()
      }
      await visitor.close()
    }

    // Seeded items get at most a few distinct viewers from other tests, so
    // five puts this item into the top five
    await page.goto("/")
    const mostViewed = page.getByRole("list", { name: "Meistgesehen (7 Tage)" })
    const entry = mostViewed
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name }) })
    await expect(entry).toContainText("5 Aufrufe")
  })
})
