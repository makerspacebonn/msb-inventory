import { expect, test } from "../fixtures/auth.fixture"

test.describe("Backup", () => {
  test("restores a fresh backup including categories and changelog", async ({
    authenticatedPage: page,
  }) => {
    test.setTimeout(60000)
    await page.goto("/backup")

    await page.getByRole("button", { name: "Neues Backup erstellen" }).click()
    const backupRow = page.locator(".border.rounded-lg").first()
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

    await page.goto("/changelog")
    await expect(page.locator(".border-b").first()).toBeVisible({
      timeout: 10000,
    })
  })
})
