import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

// Creates a top-level location and opens its page, so tests that change
// locations don't touch the seed data
async function createRootLocation(page: Page, name: string) {
  await page.goto("/locations")
  await page.getByRole("button", { name: "Neue Location" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByRole("button", { name: "Erstellen" }).click()
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
  return new URL(page.url()).searchParams.get("id")
}

async function openEditPage(page: Page) {
  await page.getByRole("link", { name: "Location bearbeiten" }).click()
  await expect(
    page.getByRole("heading", { name: "Location bearbeiten" }),
  ).toBeVisible()
}

test.describe("Edit a location", () => {
  test("changes name and description", async ({ authenticatedPage: page }) => {
    const name = `E2E Edit ${Date.now()}`
    await createRootLocation(page, name)
    await openEditPage(page)

    await expect(page.getByLabel("Name")).toHaveValue(name)
    await page.getByLabel("Name").fill(`${name} neu`)
    await page.getByLabel("Beschreibung").fill("Neue Beschreibung")
    await page.getByRole("button", { name: "Speichern" }).click()

    await expect(
      page.getByRole("heading", { name: `${name} neu`, exact: true }),
    ).toBeVisible()
    await expect(page.getByText("Neue Beschreibung")).toBeVisible()
  })

  test("can't be saved without a name", async ({ authenticatedPage: page }) => {
    await createRootLocation(page, `E2E Leer ${Date.now()}`)
    await openEditPage(page)

    await page.getByLabel("Name").fill("  ")

    await expect(page.getByRole("button", { name: "Speichern" })).toBeDisabled()
  })

  test("moves a location into another one", async ({
    authenticatedPage: page,
  }) => {
    const stamp = Date.now()
    const target = `E2E Ziel ${stamp}`
    const moved = `E2E Verschoben ${stamp}`
    await createRootLocation(page, target)
    await createRootLocation(page, moved)
    await openEditPage(page)

    await expect(page.getByTestId("location-parent-path")).toHaveText(
      "Oberste Ebene",
    )
    await page.getByRole("button", { name: "Verschieben" }).click()
    await expect(
      page.getByRole("heading", { name: "Neuen Ort wählen" }),
    ).toBeVisible()
    await page.getByRole("button", { name: target, exact: true }).click()
    await page.getByRole("button", { name: "Hier ablegen" }).click()

    await expect(page.getByTestId("location-parent-path")).toHaveText(target)
    await page.getByRole("button", { name: "Speichern" }).click()

    // The breadcrumb now leads through the new parent
    await expect(
      page.getByRole("heading", { name: moved, exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: target, exact: true }),
    ).toBeVisible()
  })

  test("refuses moving a location into its own sublocation", async ({
    authenticatedPage: page,
  }) => {
    const stamp = Date.now()
    const outer = `E2E Aussen ${stamp}`
    const inner = `E2E Innen ${stamp}`
    const outerId = await createRootLocation(page, outer)
    // Create the sublocation inside the outer location
    await page.getByRole("button", { name: "Neue Location" }).click()
    await page.getByLabel("Name").fill(inner)
    await page.getByRole("button", { name: "Erstellen" }).click()
    await expect(
      page.getByRole("heading", { name: inner, exact: true }),
    ).toBeVisible()

    await page.goto(`/locations?id=${outerId}`)
    await openEditPage(page)
    await page.getByRole("button", { name: "Verschieben" }).click()
    // The location itself isn't offered as its own parent
    await expect(
      page.getByRole("heading", { name: "Neuen Ort wählen" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: outer, exact: true }),
    ).toHaveCount(0)

    // Its sublocations can't be reached via the search either
    await page.getByPlaceholder("Location suchen...").fill(inner)
    await page.getByRole("button", { name: new RegExp(inner) }).click()

    await expect(
      page.getByText(
        "Eine Location kann nicht in sich selbst oder einen ihrer Unterorte verschoben werden",
      ),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Hier ablegen" }),
    ).toHaveCount(0)
  })

  test("isn't offered to visitors", async ({ page }) => {
    await page.goto("/locations?id=3")

    await expect(
      page.getByRole("heading", { name: "Büro", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Location bearbeiten" }),
    ).toHaveCount(0)
  })
})

test.describe("Location path photos", () => {
  test("shows the path from the top level as photos", async ({ page }) => {
    // Schublade 1 sits in Werkstatt → Werkbank 1 (which has a photo)
    await page.goto("/locations?id=100")

    const toggle = page.getByRole("button", { name: "Pfad anzeigen" })
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await toggle.click()

    const path = page.getByRole("list").filter({
      has: page.getByRole("link", { name: "Werkstatt" }),
    })
    await expect(path.getByRole("link", { name: "Werkstatt" })).toBeVisible()
    await expect(path.getByRole("link", { name: "Werkbank 1" })).toBeVisible()
    await expect(
      path.getByRole("button", { name: "Bild von Werkbank 1 vergrößern" }),
    ).toBeVisible()
    // The current location is the card above, not part of the path
    await expect(path.getByRole("link", { name: "Schublade 1" })).toHaveCount(0)

    await page.getByRole("button", { name: "Pfad ausblenden" }).click()
    await expect(path).toHaveCount(0)
  })

  test("isn't offered for top-level locations", async ({ page }) => {
    await page.goto("/locations?id=1")

    await expect(
      page.getByRole("heading", { name: "Werkstatt", exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Pfad anzeigen" }),
    ).toHaveCount(0)
  })
})
