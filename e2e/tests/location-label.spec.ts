import { expect, test } from "../fixtures/auth.fixture"

// Seed: "Werkbank 1" has the id 10. The E2E environment has no MQTT broker,
// so these tests stop before a print job would be sent.
test.describe("Location labels", () => {
  test("the short link from a label opens the location", async ({ page }) => {
    await page.goto("/l/10")

    await expect(page).toHaveURL("/locations?id=10")
    await expect(
      page.getByRole("heading", { name: "Werkbank 1", exact: true }),
    ).toBeVisible()
  })

  test("visitors can see and download the QR code, but not print", async ({
    page,
  }) => {
    await page.goto("/locations?id=10")

    await expect(page.getByRole("heading", { name: "QR-Code" })).toBeVisible()
    await expect(
      page.getByRole("img", { name: "QR-Code für Werkbank 1" }),
    ).toBeVisible()

    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "PNG herunterladen" }).click()
    expect((await download).suggestedFilename()).toBe(
      "qr-ort-10-Werkbank-1.png",
    )

    await expect(
      page.getByRole("button", { name: "Label drucken" }),
    ).toHaveCount(0)
  })

  test("logged-in users can print a label for the location", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/locations?id=10")

    await page.getByRole("button", { name: "Label drucken" }).click()

    const dialog = page.getByRole("dialog", { name: "Label drucken?" })
    await expect(dialog).toContainText('"Werkbank 1"')
    await expect(dialog).toContainText("Ort 10")
    await expect(dialog.getByRole("button", { name: "Drucken" })).toBeVisible()
  })
})
