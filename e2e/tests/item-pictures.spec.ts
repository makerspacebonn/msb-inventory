import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Locator, Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

// Two photos of different sizes: cropping keeps the size, so a picture's
// width tells which photo it is, also after saving
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
)
const large = { file: path.join(fixtures, "photo-search.jpg"), width: 120 }
const small = { file: path.join(fixtures, "photo-small.jpg"), width: 80 }

async function addPicture(page: Page, photo: { file: string }) {
  await page.getByLabel("Bild auswählen").setInputFiles(photo.file)
  const cropper = page.getByRole("dialog", { name: "Bild zuschneiden" })
  // Enabled once the cropper has measured the image
  const use = cropper.getByRole("button", { name: "Nutzen" })
  await expect(use).toBeEnabled()
  await use.click()
  await expect(cropper).toBeHidden()
}

async function expectWidth(image: Locator, width: number) {
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(width)
}

async function startItem(page: Page, name: string) {
  await page.goto("/items/add")
  await page.getByLabel("Name", { exact: true }).fill(name)
}

async function save(page: Page) {
  await page
    .getByRole("button", { name: /^(Ohne Ort erstellen|Speichern)$/ })
    .click()
  await expect(page).toHaveURL(/\/i\/\d+$/)
  return new URL(page.url()).pathname
}

test.describe("Several pictures per item", () => {
  test("saves the pictures in the chosen order, the main one first", async ({
    authenticatedPage: page,
  }) => {
    const name = `Pictures ${Date.now()}`
    await startItem(page, name)
    await addPicture(page, large)
    await addPicture(page, small)

    // The new picture is selected; make it the main one
    const pictures = page.getByRole("list", { name: "Bilder" })
    await expect(
      pictures.getByRole("button", { name: "Bild 2", pressed: true }),
    ).toBeVisible()
    await page
      .getByRole("group", { name: "Bild 2" })
      .getByRole("button", { name: "Als Hauptbild" })
      .click()
    await expect(
      pictures.getByRole("button", {
        name: "Bild 1 (Hauptbild)",
        pressed: true,
      }),
    ).toBeVisible()
    await expectWidth(page.getByRole("img", { name: "Bild 1 von 2" }), 80)

    await save(page)

    const shown = page.getByRole("img", { name, exact: true })
    await expectWidth(shown, small.width)
    await page.getByRole("button", { name: "Bild 2 anzeigen" }).click()
    await expectWidth(
      page.getByRole("img", { name: `${name}, Bild 2` }),
      large.width,
    )
  })

  test("removes a picture of a saved item", async ({
    authenticatedPage: page,
  }) => {
    const name = `Remove Picture ${Date.now()}`
    await startItem(page, name)
    await addPicture(page, large)
    await addPicture(page, small)
    const itemPath = await save(page)

    // The saved pictures come back into the form in their order
    await page.goto(`/items/add?itemId=${itemPath.split("/").at(-1)}`)
    const main = page.getByRole("img", { name: "Bild 1 von 2" })
    await expectWidth(main, large.width)
    await expect(page.getByText("Hauptbild", { exact: true })).toBeVisible()

    await page
      .getByRole("group", { name: "Bild 1" })
      .getByRole("button", { name: "Entfernen" })
      .click()
    await expectWidth(page.getByRole("img", { name: "Bild 1 von 1" }), 80)
    await save(page)

    await expectWidth(page.getByRole("img", { name, exact: true }), 80)
    // A single picture needs no thumbnails
    await expect(page.getByRole("list", { name: "Bilder" })).toHaveCount(0)
  })

  test("takes at most six pictures", async ({ authenticatedPage: page }) => {
    await startItem(page, `Six Pictures ${Date.now()}`)
    const add = page.getByRole("button", { name: "Bild hinzufügen" })

    await addPicture(page, large)
    for (let i = 2; i <= 6; i++) {
      await expect(add).toBeVisible()
      await addPicture(page, small)
    }

    await expect(
      page.getByRole("list", { name: "Bilder" }).getByRole("listitem"),
    ).toHaveCount(6)
    await expect(add).toHaveCount(0)
    await expect(page.getByText("Höchstens 6 Bilder")).toBeVisible()
  })

  test("sends all pictures to the AI analysis", async ({
    authenticatedPage: page,
  }) => {
    await startItem(page, `AI Pictures ${Date.now()}`)
    await addPicture(page, large)
    await addPicture(page, small)

    const request = page.waitForRequest(
      (r) => r.method() === "POST" && !!r.postData()?.includes("data:image"),
    )
    await page.getByRole("button", { name: "KI-Analyse starten" }).click()

    const body = (await request).postData() ?? ""
    expect(body.match(/data:image\//g)).toHaveLength(2)
    await expect(page.getByText("KI-Analyse abgeschlossen")).toBeVisible()
  })
})
