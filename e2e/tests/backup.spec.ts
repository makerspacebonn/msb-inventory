import { expect, test } from "../fixtures/auth.fixture"
import { gotoSeededEntry } from "../fixtures/changelog"

test.describe("Backup", () => {
  // One after the other: the first test counts the backups on the server
  test.describe.configure({ mode: "default" })

  test("creates exactly one backup, even when the button is tapped twice", async ({
    adminPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/backup")
    const rows = page.getByTestId("backup-row")
    const before = await rows.count()
    const create = page.getByRole("button", { name: "Neues Backup erstellen" })

    // A GET could be repeated by the browser on a bad connection
    const request = page.waitForRequest((r) => r.url().includes("/_serverFn/"))
    await create.dblclick()
    expect((await request).method()).toBe("POST")
    await expect(create).toBeEnabled({ timeout: 15000 })

    // Reloaded, so this is what's really on the server
    await page.reload()
    await expect(rows).toHaveCount(before + 1)
  })

  test("fits a phone, with readable details and easy to tap actions", async ({
    adminPage: page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto("/backup")
    const create = page.getByRole("button", { name: "Neues Backup erstellen" })
    await create.click()
    const row = page.getByTestId("backup-row").first()
    await expect(row).toBeVisible({ timeout: 15000 })

    // No sideways scrolling, for the page or inside the row
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    // Name, date and size are there, and the name isn't cut off
    const name = row.getByText(/^backup-.*\.zip$/)
    await expect(name).toBeInViewport({ ratio: 1 })
    await expect(row).toContainText(/\d{2}\.\d{2}\.\d{4}/)
    await expect(row).toContainText(/\d+(\.\d+)? (B|KB|MB)/)

    const actions = [
      row.getByRole("link", { name: "Download" }),
      row.getByRole("button", { name: "Restore" }),
      row.getByRole("button", { name: "Backup löschen" }),
    ]
    for (const action of actions) {
      await expect(action).toBeInViewport({ ratio: 1 })
      const box = await action.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }
  })

  test("asks before deleting a backup", async ({ adminPage: page }) => {
    await page.goto("/backup")
    await page.getByRole("button", { name: "Neues Backup erstellen" }).click()
    const rows = page.getByTestId("backup-row")
    const row = rows.first()
    await expect(row).toBeVisible({ timeout: 15000 })
    const name = await row.getByText(/^backup-.*\.zip$/).textContent()
    const entry = rows.filter({ hasText: name ?? "" })

    const remove = entry.getByRole("button", { name: "Backup löschen" })
    const dialog = page.getByRole("dialog", { name: "Backup löschen" })

    // Cancelling keeps it, also after a reload
    await remove.click()
    await expect(dialog).toContainText(name ?? "")
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await expect(entry).toBeVisible()

    await remove.click()
    await dialog.getByRole("button", { name: "Löschen" }).click()
    await expect(entry).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(entry).toHaveCount(0)
  })

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

    const restore = backupRow.getByRole("button", { name: "Restore" })
    const dialog = page.getByRole("dialog", {
      name: "Backup wiederherstellen",
    })
    const result = page.getByText(/Wiederherstellung/)

    // Cancelling restores nothing
    await restore.click()
    await expect(dialog).toContainText(/backup-.*\.zip/)
    await expect(dialog).toContainText("überschrieben")
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await expect(dialog).toBeHidden()
    await expect(result).toHaveCount(0)

    await restore.click()
    await dialog.getByRole("button", { name: "Wiederherstellen" }).click()
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

    await expect(
      await gotoSeededEntry(page, "Bohrmaschine Makita"),
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
