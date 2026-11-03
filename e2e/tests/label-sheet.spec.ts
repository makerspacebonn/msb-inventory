import fs from "node:fs"
import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

// Seed: "Regal A" (20) holds "Fach A1" and "Fach A2"; no other test
// changes them. Item 1 is "Bohrmaschine Makita".

const labelList = (page: Page) => page.getByRole("list", { name: "Etiketten" })

async function addFromSearch(page: Page, query: string, button: string) {
  await page
    .getByRole("searchbox", { name: "Items und Orte für Etiketten suchen" })
    .fill(query)
  await page
    .getByRole("list", { name: "Suchergebnisse" })
    .getByRole("button", { name: button })
    .click()
}

test.describe("Label sheets", () => {
  test("creates a PDF for the selected labels, from the chosen start label", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/labels")
    await expect(
      page.getByRole("heading", { name: "Etiketten drucken" }),
    ).toBeVisible()
    await expect(
      page.getByText("Noch keine Etiketten ausgewählt"),
    ).toBeVisible()

    await addFromSearch(page, "Regal A", "Regal A mit Unterorten hinzufügen")
    await addFromSearch(page, "Bohrmaschine", "Bohrmaschine Makita hinzufügen")

    const list = labelList(page)
    for (const name of [
      "Regal A",
      "Fach A1",
      "Fach A2",
      "Bohrmaschine Makita",
    ]) {
      await expect(list.getByText(name, { exact: true })).toBeVisible()
    }
    await list.getByRole("spinbutton", { name: "Anzahl für Fach A1" }).fill("2")
    await expect(
      page.getByRole("heading", { name: "3. Etiketten (5)" }),
    ).toBeVisible()

    // Start on the 5th label of a partly used sheet
    await page.getByRole("button", { name: "Etikett 5", exact: true }).click()
    await expect(
      page.getByRole("button", { name: "Etikett 5", exact: true }),
    ).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText("Beginnt bei Etikett 5")).toBeVisible()

    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "PDF erstellen" }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(
      /^etiketten-\d{4}-\d{2}-\d{2}\.pdf$/,
    )
    const pdf = fs.readFileSync(await file.path())
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    // 5 labels from label 5 of 18 fit on one sheet
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1)

    // The next print continues after the 5 printed labels
    await expect(
      page.getByRole("button", { name: "Etikett 10", exact: true }),
    ).toHaveAttribute("aria-pressed", "true")
  })

  test("collects items and locations while browsing, only when started", async ({
    authenticatedPage: page,
  }) => {
    const toggle = page.getByRole("button", { name: "Auf den Etikettenbogen" })

    // Not collecting: item pages stay as they are
    await page.goto("/i/1")
    await expect(
      page.getByRole("heading", { name: "Bohrmaschine Makita" }),
    ).toBeVisible()
    await expect(toggle).toHaveCount(0)

    await page.goto("/labels")
    await page.getByRole("button", { name: "Beim Stöbern sammeln" }).click()
    await expect(
      page.getByRole("link", { name: "Etikettenbogen: 0 Etiketten" }),
    ).toBeVisible()

    await page.goto("/i/1")
    await toggle.click()
    await expect(
      page.getByRole("button", { name: "Auf dem Etikettenbogen" }),
    ).toHaveAttribute("aria-pressed", "true")

    await page.goto("/locations?id=20")
    await page.getByRole("button", { name: "Mit Unterorten" }).click()
    await expect(
      page.getByRole("link", { name: "Etikettenbogen: 4 Etiketten" }),
    ).toBeVisible()

    await page
      .getByRole("link", { name: "Etikettenbogen: 4 Etiketten" })
      .click()
    const list = labelList(page)
    for (const name of [
      "Bohrmaschine Makita",
      "Regal A",
      "Fach A1",
      "Fach A2",
    ]) {
      await expect(list.getByText(name, { exact: true })).toBeVisible()
    }

    // Clearing the list also ends collecting
    await page.getByRole("button", { name: "Liste leeren" }).click()
    await expect(
      page.getByText("Noch keine Etiketten ausgewählt"),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /^Etikettenbogen:/ }),
    ).toHaveCount(0)
    await page.goto("/i/1")
    await expect(
      page.getByRole("heading", { name: "Bohrmaschine Makita" }),
    ).toBeVisible()
    await expect(toggle).toHaveCount(0)
  })

  test("adds all items of a location, including its sublocations", async ({
    authenticatedPage: page,
  }) => {
    // "Filament PLA Schwarz" lies in Fach A1, "Schraubenset M3" in Fach A2,
    // both below Regal A; "Bohrmaschine Makita" lies elsewhere
    await page.goto("/labels")
    await addFromSearch(page, "Regal A", "Alle Items in Regal A hinzufügen")

    const list = labelList(page)
    await expect(
      list.getByText("Filament PLA Schwarz", { exact: true }),
    ).toBeVisible()
    await expect(
      list.getByText("Schraubenset M3", { exact: true }),
    ).toBeVisible()
    await expect(
      list.getByText("Bohrmaschine Makita", { exact: true }),
    ).toHaveCount(0)
    // Only items: the locations themselves aren't added
    await expect(list.getByText("Regal A", { exact: true })).toHaveCount(0)
  })

  test("isn't available to visitors", async ({ page }) => {
    await page.goto("/labels")
    await expect(page.getByText("Unauthorized")).toBeVisible()
  })
})
