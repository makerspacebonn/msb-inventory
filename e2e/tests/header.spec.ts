import { expect, test } from "../fixtures/auth.fixture"

test.describe("Header: add item", () => {
  test("is an icon button for logged-in users", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/")

    const addItem = page
      .getByRole("banner")
      .getByRole("link", { name: "Item hinzufügen" })
    await expect(addItem).toBeVisible()
    // Icon only: the name comes from the label, not from visible text
    await expect(addItem).toHaveText("")
  })

  test("isn't shown to visitors", async ({ page }) => {
    await page.goto("/")

    const banner = page.getByRole("banner")
    await expect(banner.getByRole("link", { name: "Anmelden" })).toBeVisible()
    await expect(
      banner.getByRole("link", { name: "Item hinzufügen" }),
    ).toHaveCount(0)
  })
})

test.describe("Header: menu", () => {
  test("holds the rarely used pages instead of the header", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/")
    const banner = page.getByRole("banner")
    await expect(banner.getByRole("link", { name: "Items" })).toBeVisible()
    await expect(banner.getByRole("link", { name: "Changelog" })).toHaveCount(0)
    await expect(banner.getByRole("link", { name: "Drucker" })).toHaveCount(0)

    await page.getByRole("button", { name: "Menü öffnen" }).click()

    const menu = page.getByRole("dialog", { name: "Menü" })
    await expect(menu.getByRole("link", { name: "Changelog" })).toBeVisible()
    await expect(menu.getByRole("link", { name: "Drucker" })).toBeVisible()
    // Backup is for admins only
    await expect(menu.getByRole("link", { name: "Backup" })).toHaveCount(0)

    await menu.getByRole("link", { name: "Changelog" }).click()
    await expect(page).toHaveURL(/\/changelog(\?|$)/)
    await expect(menu).toBeHidden()
  })

  test("offers the backup to admins", async ({ adminPage: page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: "Menü öffnen" }).click()

    await expect(
      page.getByRole("dialog", { name: "Menü" }).getByRole("link", {
        name: "Backup",
      }),
    ).toBeVisible()
  })

  test("only offers pages visitors may open", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: "Menü öffnen" }).click()

    const menu = page.getByRole("dialog", { name: "Menü" })
    await expect(menu.getByRole("link", { name: "Changelog" })).toBeVisible()
    await expect(menu.getByRole("link", { name: "Drucker" })).toHaveCount(0)
    await expect(menu.getByRole("link", { name: "Backup" })).toHaveCount(0)

    // The statistics are public
    await menu.getByRole("link", { name: "Statistik" }).click()
    await expect(page).toHaveURL(/\/stats\?days=30/)
    await expect(page.getByRole("heading", { name: "Aktivität" })).toBeVisible()
    await expect(menu).toBeHidden()
  })

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("holds the main pages and the login", async ({ page }) => {
      await page.goto("/")
      await expect(
        page.getByRole("banner").getByRole("link", { name: "Items" }),
      ).toBeHidden()

      await page.getByRole("button", { name: "Menü öffnen" }).click()

      const menu = page.getByRole("dialog", { name: "Menü" })
      await expect(menu.getByRole("link", { name: "Items" })).toBeVisible()
      await expect(menu.getByRole("link", { name: "Locations" })).toBeVisible()
      await expect(menu.getByRole("link", { name: "Anmelden" })).toBeVisible()
    })
  })
})

test.describe("Header: search", () => {
  test("shows results while typing", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("searchbox", { name: "Items suchen" }).fill("Makita")

    const results = page.getByRole("list", { name: "Suchergebnisse" })
    await results.getByRole("link", { name: /Bohrmaschine Makita/ }).click()

    await expect(page).toHaveURL("/i/1")
    await expect(
      page.getByRole("heading", { level: 1, name: "Bohrmaschine Makita" }),
    ).toBeVisible()
    // The search is cleared after opening a result
    await expect(
      page.getByRole("searchbox", { name: "Items suchen" }),
    ).toHaveValue("")
  })

  test("opens the full results", async ({ page }) => {
    await page.goto("/locations")

    await page.getByRole("searchbox", { name: "Items suchen" }).fill("Makita")
    await page.getByRole("link", { name: "Alle Ergebnisse anzeigen" }).click()

    await expect(page).toHaveURL("/items?q=Makita")
  })

  test("opens the full results with Enter", async ({ page }) => {
    await page.goto("/locations")

    const search = page.getByRole("searchbox", { name: "Items suchen" })
    await search.fill("Makita")
    await search.press("Enter")

    await expect(page).toHaveURL("/items?q=Makita")
  })

  test("says when nothing was found", async ({ page }) => {
    await page.goto("/")

    await page
      .getByRole("searchbox", { name: "Items suchen" })
      .fill("xyzkeintreffer")

    await expect(page.getByText("Keine Items gefunden")).toBeVisible()
  })

  test("closes the results with Escape", async ({ page }) => {
    await page.goto("/")

    const search = page.getByRole("searchbox", { name: "Items suchen" })
    await search.fill("Makita")
    const results = page.getByRole("list", { name: "Suchergebnisse" })
    await expect(results).toBeVisible()

    await search.press("Escape")

    await expect(results).toHaveCount(0)
  })

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("is usable", async ({ page }) => {
      await page.goto("/")

      await page.getByRole("searchbox", { name: "Items suchen" }).fill("Makita")

      await expect(
        page
          .getByRole("list", { name: "Suchergebnisse" })
          .getByRole("link", { name: /Bohrmaschine Makita/ }),
      ).toBeVisible()
    })
  })
})

test.describe("Header: sticky", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("stays at the top while scrolling a long page", async ({ page }) => {
    await page.goto("/items")
    await expect(
      page.getByRole("searchbox", { name: "Items suchen" }),
    ).toBeVisible()

    // The page must really have scrolled, or the check below proves nothing.
    // Repeated, as the router may reset the scroll position while loading
    await expect
      .poll(() =>
        page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight)
          return window.scrollY
        }),
      )
      .toBeGreaterThan(300)

    await expect(page.getByRole("banner")).toBeInViewport()
    await expect(
      page.getByRole("searchbox", { name: "Items suchen" }),
    ).toBeInViewport()
    const box = await page.getByRole("banner").boundingBox()
    expect(box?.y).toBe(0)
  })
})

test.describe("Footer", () => {
  test("shows the version instead of the logo", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("contentinfo")).toContainText(/v\d+\.\d+\.\d+/)
    await expect(page.getByRole("banner")).not.toContainText(/v\d+\.\d+\.\d+/)
  })
})
