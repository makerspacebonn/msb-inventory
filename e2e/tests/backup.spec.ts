import { expect, test } from "../fixtures/auth.fixture"

test.describe("Backup", () => {
  test("restores a fresh backup including categories, changelog and statistics", async ({
    adminPage: page,
  }) => {
    test.setTimeout(60000)
    // At least one counted search, so the backup has search statistics
    await page.goto("/items?q=Bohrmaschine")
    await expect(
      page.getByRole("link", { name: /Bohrmaschine Makita/ }).first(),
    ).toBeVisible()

    // And one item view
    await page.goto("/i/1")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    await page.goto("/backup")

    await page.getByRole("button", { name: "Neues Backup erstellen" }).click()
    const backupRow = page.getByTestId("backup-row").first()
    await expect(backupRow).toContainText(/backup-.*\.zip/, { timeout: 15000 })

    page.once("dialog", (dialog) => dialog.accept())
    await backupRow.getByRole("button", { name: "Restore" }).click()

    const result = page.getByText(/Wiederherstellung/)
    await expect(result).toContainText("erfolgreich", { timeout: 30000 })

    // The seed data has changelog entries; they must survive the restore
    const changelogCount = (await result.textContent())?.match(
      /(\d+) Änderungen/,
    )?.[1]
    expect(Number(changelogCount)).toBeGreaterThan(0)
    const searchDays = (await result.textContent())?.match(
      /Suchstatistik für (\d+) Tage/,
    )?.[1]
    expect(Number(searchDays)).toBeGreaterThan(0)
    const viewRows = (await result.textContent())?.match(
      /(\d+) Einträge zu Aufrufen/,
    )?.[1]
    expect(Number(viewRows)).toBeGreaterThan(0)

    await page.goto("/changelog")
    await expect(
      page
        .getByTestId("changelog-entry")
        .filter({ hasText: "Bohrmaschine Makita" }),
    ).toBeVisible()
  })

  test("is not available to non-admins", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/backup")
    await expect(
      page.getByRole("button", { name: "Neues Backup erstellen" }),
    ).toHaveCount(0)

    // Also blocked when calling the server directly
    const response = await page.request.get("/backup/download/any.zip")
    expect(response.status()).toBe(403)
  })
})
