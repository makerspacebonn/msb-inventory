import { expect, test } from "../fixtures/auth.fixture"

// Seed data: "Test Item 30" lives in "Regal A" (Lager → Regal A),
// "Test Item 35" lives in "Fach A2" (Lager → Regal A → Fach A2)
test.describe("Item Location Picker", () => {
  test("should start at the item's current location", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/30/location/add")

    await expect(
      page.getByRole("heading", { name: "Regal A", exact: true }),
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
      page.getByRole("heading", { name: "Fach A1", exact: true }),
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

    // The URL changes before the item page replaces the picker, so wait for
    // the item page before checking its location path
    await expect(page).toHaveURL(/\/i\/35$/)
    await expect(
      // Exact: the picker's heading "Ort auswählen für Test Item 35" mustn't match
      page.getByRole("heading", {
        level: 1,
        name: "Test Item 35",
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.getByText("Werkbank 2", { exact: true })).toBeVisible()
  })

  test("offers creating a sublocation next to placing the item", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/30/location/add?at=20")

    // A button next to "Hier ablegen", no longer a tile among the sublocations
    await expect(
      page.getByRole("button", { name: "Hier ablegen" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Neue Location" }).click()
    await expect(page.getByLabel("Name")).toBeVisible()
  })

  test.describe("on a phone", () => {
    // Set after logging in: the login check looks for the user name, which
    // the header only shows on wider screens
    const phone = { width: 390, height: 844 }

    test("shows the first sublocations within the first screen", async ({
      authenticatedPage: page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "msb-inventory:recent-locations",
          JSON.stringify([
            { id: 100, name: "Schublade 1", path: "Werkstatt → Werkbank 1" },
            { id: 11, name: "Werkbank 2", path: "Werkstatt" },
            { id: 201, name: "Fach A2", path: "Lager → Regal A" },
          ]),
        )
      })
      await page.setViewportSize(phone)
      await page.goto("/items/30/location/add?at=20")

      await expect(
        page.getByRole("button", { name: "Hier ablegen" }),
      ).toBeInViewport({ ratio: 1 })
      await expect(
        page.getByRole("button", { name: "Fach A1", exact: true }),
      ).toBeInViewport({ ratio: 1 })
    })

    test("removes a recent location by tapping its X", async ({
      authenticatedPage: page,
    }) => {
      await page.addInitScript(() => {
        // Only on the first load, so the removal survives the reload below
        if (sessionStorage.getItem("seeded")) return
        sessionStorage.setItem("seeded", "1")
        localStorage.setItem(
          "msb-inventory:recent-locations",
          JSON.stringify([
            { id: 100, name: "Schublade 1", path: "Werkstatt → Werkbank 1" },
            { id: 11, name: "Werkbank 2", path: "Werkstatt" },
          ]),
        )
      })
      await page.setViewportSize(phone)
      await page.goto("/items/30/location/add?at=20")

      const recent = page.getByRole("list", { name: "Zuletzt verwendet" })
      await expect(recent.getByRole("listitem")).toHaveCount(2)
      await recent
        .getByRole("button", {
          name: 'Werkbank 2 aus "Zuletzt verwendet" entfernen',
        })
        .click()

      await expect(recent.getByRole("listitem")).toHaveCount(1)
      await expect(
        recent.getByRole("button", { name: "Schublade 1", exact: true }),
      ).toBeVisible()
      await page.reload()
      await expect(recent.getByRole("listitem")).toHaveCount(1)
    })
  })
})
