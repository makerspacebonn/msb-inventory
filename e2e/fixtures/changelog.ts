import { expect, type Page } from "@playwright/test"

/**
 * Opens the changelog page showing an entity's seeded entry. Other tests add
 * entries, so a seeded entry can be on any page; the oldest are at the end.
 */
export async function gotoSeededEntry(page: Page, entityName: string) {
  await page.goto("/changelog")
  const position = page.getByText(/^Seite \d+ von \d+$/)
  await expect(position).toBeVisible()
  const lastPage = Number(
    (await position.textContent())?.match(/von (\d+)/)?.[1],
  )

  for (let number = lastPage; number >= 1; number--) {
    await page.goto(`/changelog?page=${number}`)
    await expect(page.getByText(`Seite ${number} von`)).toBeVisible()
    const entries = page
      .getByTestId("changelog-entry")
      .filter({ has: page.getByText(entityName, { exact: true }) })
    if ((await entries.count()) > 0) return entries
  }
  throw new Error(`No changelog entry for "${entityName}"`)
}
