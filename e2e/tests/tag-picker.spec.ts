import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

const photo = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/photo-search.jpg",
)

// Seed tags include "Elektro", "Elektronik", "Werkzeug" and "Löten"

const overlay = (page: Page) =>
  page.getByRole("dialog", { name: "Tag hinzufügen" })
const tagInput = (page: Page) =>
  page.getByRole("combobox", { name: "Tag suchen oder neu eingeben" })
const itemTags = (page: Page) => page.getByRole("list", { name: "Tags" })

async function openOverlay(page: Page) {
  await page.getByRole("button", { name: "Tag hinzufügen" }).click()
  await expect(overlay(page)).toBeVisible()
}

test.describe("Tag picker on a phone", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // After logging in: the login check needs the wider header
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/items/add")
  })

  test("adds an existing tag by tapping a suggestion", async ({
    authenticatedPage: page,
  }) => {
    await openOverlay(page)

    // The input waits at the top, ready for typing
    await expect(tagInput(page)).toBeFocused()
    const box = await tagInput(page).boundingBox()
    expect(box?.y).toBeLessThan(100)

    await tagInput(page).fill("elektro")
    const suggestions = overlay(page).getByRole("listbox", {
      name: "Vorschläge",
    })
    await suggestions
      .getByRole("option", { name: "Elektro", exact: true })
      .click()

    await expect(overlay(page)).toBeHidden()
    await expect(itemTags(page).getByRole("listitem")).toHaveText(["Elektro"])

    // A tag the item has isn't suggested again. "Elektronik" shows that the
    // suggestions have loaded, so the missing "Elektro" means something
    await openOverlay(page)
    await tagInput(page).fill("elektro")
    await expect(
      suggestions.getByRole("option", { name: "Elektronik", exact: true }),
    ).toBeVisible()
    await expect(
      suggestions.getByRole("option", { name: "Elektro", exact: true }),
    ).toHaveCount(0)
  })

  test("adds typed text as a new tag with Enter, and saves it", async ({
    authenticatedPage: page,
  }) => {
    const name = `Tag Test ${Date.now()}`
    const newTag = `E2E Tag ${Date.now()}`
    await page.getByLabel("Name", { exact: true }).fill(name)

    await openOverlay(page)
    await tagInput(page).fill(newTag)
    await tagInput(page).press("Enter")

    await expect(overlay(page)).toBeHidden()
    await expect(itemTags(page).getByRole("listitem")).toHaveText([newTag])

    // Typing a known tag in another case keeps its spelling
    await openOverlay(page)
    await tagInput(page).fill("löten")
    // Wait for the suggestion, so Enter knows the existing spelling
    await expect(
      overlay(page).getByRole("option", { name: "Löten", exact: true }),
    ).toBeVisible()
    await tagInput(page).press("Enter")
    await expect(itemTags(page).getByRole("listitem")).toHaveText([
      newTag,
      "Löten",
    ])

    await page.getByRole("button", { name: "Ohne Ort erstellen" }).click()
    await expect(page).toHaveURL(/\/i\/\d+$/)
    for (const tag of [newTag, "Löten"]) {
      await expect(
        page.getByRole("link", { name: tag, exact: true }),
      ).toBeVisible()
    }
  })

  test("closes with X without changing the tags", async ({
    authenticatedPage: page,
  }) => {
    await openOverlay(page)
    await tagInput(page).fill("Werkzeug")
    await overlay(page).getByRole("button", { name: "Schließen" }).click()

    await expect(overlay(page)).toBeHidden()
    await expect(itemTags(page)).toHaveCount(0)
  })

  test("removes a tag with its X", async ({ authenticatedPage: page }) => {
    await openOverlay(page)
    await tagInput(page).fill("Neu A")
    await tagInput(page).press("Enter")
    await openOverlay(page)
    await tagInput(page).fill("Neu B")
    await tagInput(page).press("Enter")
    await expect(itemTags(page).getByRole("listitem")).toHaveText([
      "Neu A",
      "Neu B",
    ])

    await page.getByRole("button", { name: "Tag Neu A entfernen" }).click()
    await expect(itemTags(page).getByRole("listitem")).toHaveText(["Neu B"])
  })

  test("keeps the entered tags when accepting the AI's tags", async ({
    authenticatedPage: page,
  }) => {
    // The AI stub suggests Werkzeug, Schrauben and Elektro
    for (const tag of ["Akku", "Werkzeug"]) {
      await openOverlay(page)
      await tagInput(page).fill(tag)
      await tagInput(page).press("Enter")
    }

    await page.getByLabel("Bild auswählen").setInputFiles(photo)
    const cropper = page.getByRole("dialog", { name: "Bild zuschneiden" })
    const use = cropper.getByRole("button", { name: "Nutzen" })
    await expect(use).toBeEnabled()
    await use.click()
    await page.getByRole("button", { name: "KI-Analyse starten" }).click()

    // Only the tags the item doesn't have yet are suggested
    const suggestion = page.getByRole("group", {
      name: "KI-Vorschlag für Tags",
    })
    await expect(suggestion).toContainText("Schrauben")
    await expect(suggestion).toContainText("Elektro")
    await expect(suggestion).not.toContainText("Werkzeug")
    await suggestion.getByRole("button", { name: "Übernehmen" }).click()

    await expect(itemTags(page).getByRole("listitem")).toHaveText([
      "Akku",
      "Werkzeug",
      "Schrauben",
      "Elektro",
    ])
  })
})

test.describe("Tag picker on a desktop", () => {
  test("selects a suggestion with the arrow keys and accepts it with Enter", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/add")
    await openOverlay(page)
    await tagInput(page).fill("elektro")

    // Rows: „elektro“ is a known tag in another case, so there's no "new"
    // row; the suggestions are Elektro and Elektronik in some order
    const options = overlay(page).getByRole("option")
    await expect(options).toHaveCount(2)
    const second = (await options.nth(1).textContent())?.trim()

    await tagInput(page).press("ArrowDown")
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true")
    await tagInput(page).press("ArrowDown")
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true")
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "false")
    // Stops at the last row
    await tagInput(page).press("ArrowDown")
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true")
    await expect(tagInput(page)).toHaveAttribute(
      "aria-activedescendant",
      (await options.nth(1).getAttribute("id")) ?? "",
    )

    await tagInput(page).press("Enter")
    await expect(overlay(page)).toBeHidden()
    await expect(itemTags(page).getByRole("listitem")).toHaveText([
      second ?? "",
    ])
  })

  test("Enter without a selection takes the typed text", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/items/add")
    await openOverlay(page)
    await tagInput(page).fill("Neues Tag")
    await expect(
      overlay(page).getByRole("option", { name: /^„Neues Tag“/ }),
    ).toBeVisible()
    // Up from the first row clears the selection again
    await tagInput(page).press("ArrowDown")
    await tagInput(page).press("ArrowUp")
    await tagInput(page).press("Enter")

    await expect(itemTags(page).getByRole("listitem")).toHaveText(["Neues Tag"])
  })
})
