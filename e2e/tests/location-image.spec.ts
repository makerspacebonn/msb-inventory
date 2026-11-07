import path from "node:path"
import { fileURLToPath } from "node:url"
import type { BrowserContext, Locator, Page } from "@playwright/test"
import { expect, test } from "../fixtures/auth.fixture"

const photo = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/photo-search.jpg",
)

async function choosePhoto(page: Page) {
  await page.getByLabel("Bild auswählen").setInputFiles(photo)
  const cropper = page.getByRole("dialog", { name: "Bild zuschneiden" })
  const use = cropper.getByRole("button", { name: "Nutzen" })
  await expect(use).toBeEnabled()
  await use.click()
  await expect(cropper).toBeHidden()
}

/** Clicks at a position given in percent of the element */
async function clickAt(target: Locator, x: number, y: number) {
  const box = await target.boundingBox()
  if (!box) throw new Error("The element isn't visible")
  await target.click({
    position: { x: (box.width * x) / 100, y: (box.height * y) / 100 },
  })
}

async function addLocation(page: Page, name: string) {
  await page.getByRole("button", { name: "Neue Location" }).click()
  await page.getByLabel("Name").fill(name)
}

/**
 * A location with an image and sublocations marked on it, created through
 * the app. Returns the address of its page
 */
async function locationWithMarkers(
  page: Page,
  name: string,
  markers: Record<string, [number, number]>,
) {
  await page.goto("/locations")
  await addLocation(page, name)
  await choosePhoto(page)
  await page.getByRole("button", { name: "Erstellen" }).click()
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
  const url = page.url()

  for (const [label, [x, y]] of Object.entries(markers)) {
    await page.goto(url)
    await addLocation(page, label)
    await page.getByRole("button", { name: "Weiter zur Markierung" }).click()
    await expect(
      page.getByRole("heading", { name: "Position markieren" }),
    ).toBeVisible()
    await clickAt(page.getByRole("button", { name }), x, y)
    await page.getByRole("button", { name: "Speichern", exact: true }).click()
    await expect(page.getByRole("heading", { name: label })).toBeVisible()
  }
  await page.goto(url)
  return url
}

async function startReplacing(page: Page) {
  await page.getByRole("link", { name: "Bild ersetzen" }).click()
  await expect(page.getByText("Schritt 1 von 3")).toBeVisible()
  await choosePhoto(page)
  await page.getByRole("button", { name: "Weiter" }).click()
  await expect(page.getByText("Schritt 2 von 3")).toBeVisible()
}

const oldImage = (page: Page) =>
  page.getByRole("button", { name: "Altes Bild" })
const newImage = (page: Page) =>
  page.getByRole("button", { name: "Neues Bild" })

/** Sets matching points near the corners; `shift` moves them on the new image */
async function setPoints(page: Page, shift: [number, number], count = 4) {
  const corners = [
    [15, 15],
    [65, 15],
    [65, 85],
    [15, 85],
  ]
  for (const [x, y] of corners.slice(0, count)) {
    await clickAt(oldImage(page), x, y)
    await clickAt(newImage(page), x + shift[0], y + shift[1])
  }
}

/** A marker's dot on the new image sits at this position */
async function expectMarkerAt(page: Page, label: string, x: number, y: number) {
  const dot = page
    .getByRole("button", { name: label, exact: true })
    .and(page.getByTitle(label))
  await expect(dot).toHaveCSS("left", /.+/)
  const position = await dot.evaluate((element) => ({
    left: (element as HTMLElement).style.left,
    top: (element as HTMLElement).style.top,
  }))
  expect(parseFloat(position.left)).toBeCloseTo(x, -0.5)
  expect(parseFloat(position.top)).toBeCloseTo(y, -0.5)
}

/** The faint dot of a marker on the location's page */
async function savedMarker(page: Page, label: string) {
  const dot = page.getByTitle(label, { exact: true })
  const enlarge = page.getByRole("button", { name: "Bild vergrößern" })
  // Markers show on the enlarged image; repeated, as a click may come before
  // the page has loaded
  await expect(async () => {
    if (await enlarge.isVisible()) await enlarge.click()
    await expect(dot).toBeAttached({ timeout: 500 })
  }).toPass()
  return dot.evaluate((element) => ({
    x: parseFloat((element as HTMLElement).style.left),
    y: parseFloat((element as HTMLElement).style.top),
  }))
}

const locationImageSrc = async (page: Page, name: string) =>
  page.getByRole("img", { name, exact: true }).first().getAttribute("src")

test.describe("Replacing a location image", () => {
  test("carries the markers over, shows the old one while placing, and can be undone", async ({
    adminPage: page,
  }) => {
    const stamp = Date.now()
    const name = `Regal ${stamp}`
    const [left, right] = [`Links ${stamp}`, `Rechts ${stamp}`]
    const url = await locationWithMarkers(page, name, {
      [left]: [25, 25],
      [right]: [60, 70],
    })
    const originalSrc = await locationImageSrc(page, name)

    await startReplacing(page)
    await setPoints(page, [10, 0])
    await page.getByRole("button", { name: "Weiter" }).click()
    await expect(page.getByText("Schritt 3 von 3")).toBeVisible()

    // The markers moved with the points
    await expectMarkerAt(page, left, 35, 25)
    await expectMarkerAt(page, right, 70, 70)

    // Choosing a marker shows where it was on the old image
    await page
      .getByRole("list", { name: "Marker" })
      .getByRole("button", { name: right, exact: true })
      .click()
    await expect(page.getByText(`Alte Position von ${right}`)).toBeVisible()
    const oldPosition = page.getByTestId("old-position")
    await expect(oldPosition).toHaveCount(1)
    await expect(oldPosition).toHaveAttribute("style", /left: 6\d%.*top: 7\d%/)

    // Corrected by hand: an object that really moved
    await clickAt(newImage(page), 50, 50)
    await expectMarkerAt(page, right, 50, 50)

    await page.getByRole("button", { name: "Speichern" }).click()
    await expect(page.getByText("Bild ersetzt")).toBeVisible()
    await expect(page).toHaveURL(url)

    expect(await locationImageSrc(page, name)).not.toBe(originalSrc)
    const movedLeft = await savedMarker(page, left)
    expect(movedLeft.x).toBeCloseTo(35, -0.5)
    expect(await savedMarker(page, right)).toEqual({ x: 50, y: 50 })

    // One line in the changelog, leading with the image
    await page.goto("/changelog")
    const group = page
      .getByTestId("changelog-group")
      .filter({
        has: page.getByRole("button", { name: /2 weitere Änderungen/ }),
      })
      .filter({ hasText: name })
    const entry = group.getByTestId("changelog-entry")
    await entry.getByRole("button", { expanded: false }).click()
    await entry.getByRole("button", { name: "Rückgängig" }).click()
    const dialog = page.getByRole("dialog", {
      name: "Änderung rückgängig machen?",
    })
    await expect(dialog).toContainText("Alle 3 Einträge")
    await dialog.getByRole("button", { name: "Ja, rückgängig machen" }).click()
    await expect(
      page.getByText("3 Änderungen rückgängig gemacht"),
    ).toBeVisible()

    // Everything as it was before
    await page.goto(url)
    expect(await locationImageSrc(page, name)).toBe(originalSrc)
    expect(await savedMarker(page, left)).toEqual({ x: 25, y: 25 })
    expect(await savedMarker(page, right)).toEqual({ x: 60, y: 70 })
  })

  test("lists markers that don't fit, and only saves once they are handled", async ({
    adminPage: page,
  }) => {
    const stamp = Date.now()
    const [inside, outside, placed] = [
      `Bleibt ${stamp}`,
      `Weg ${stamp}`,
      `Neu ${stamp}`,
    ]
    const url = await locationWithMarkers(page, `Eng ${stamp}`, {
      [inside]: [20, 50],
      [outside]: [90, 50],
      [placed]: [85, 20],
    })

    await startReplacing(page)
    await setPoints(page, [30, 0])
    await page.getByRole("button", { name: "Weiter" }).click()

    const warning = page.getByRole("alert")
    await expect(warning).toContainText("2 Marker passen nicht")
    await expect(warning).toContainText(outside)
    await expect(warning).toContainText(placed)
    const save = page.getByRole("button", { name: "Speichern" })
    await expect(save).toBeDisabled()

    await page
      .getByRole("button", { name: `Marker von ${outside} entfernen` })
      .click()
    await expect(warning).toContainText("1 Marker passt nicht")
    await expect(save).toBeDisabled()

    // The remaining one is selected and goes where the image is tapped
    await page
      .getByRole("list", { name: "Marker" })
      .getByRole("button", { name: new RegExp(`^${placed}`) })
      .click()
    await clickAt(newImage(page), 40, 40)
    await expect(warning).toHaveCount(0)

    await save.click()
    await expect(page.getByText("Bild ersetzt")).toBeVisible()
    await expect(page).toHaveURL(url)
    expect(await savedMarker(page, placed)).toEqual({ x: 40, y: 40 })
    await expect(page.getByTitle(outside, { exact: true })).toHaveCount(0)
  })

  test("can skip the points and move a marker by dragging", async ({
    adminPage: page,
  }) => {
    const stamp = Date.now()
    const label = `Hand ${stamp}`
    const url = await locationWithMarkers(page, `Umbau ${stamp}`, {
      [label]: [30, 30],
    })

    await startReplacing(page)
    await page.getByRole("button", { name: "Marker von Hand setzen" }).click()
    await expect(page.getByText("Schritt 3 von 3")).toBeVisible()
    await expectMarkerAt(page, label, 30, 30)

    const image = await newImage(page).boundingBox()
    if (!image) throw new Error("The image isn't visible")
    await page
      .getByRole("button", { name: label, exact: true })
      .and(page.getByTitle(label))
      .hover()
    await page.mouse.down()
    await page.mouse.move(
      image.x + image.width * 0.7,
      image.y + image.height * 0.6,
      { steps: 5 },
    )
    // The loupe shows the spot while dragging
    await expect(page.getByTestId("loupe")).toBeVisible()
    await page.mouse.up()
    await expect(page.getByTestId("loupe")).toHaveCount(0)
    await expectMarkerAt(page, label, 70, 60)

    await page.getByRole("button", { name: "Speichern" }).click()
    await expect(page.getByText("Bild ersetzt")).toBeVisible()
    await expect(page).toHaveURL(url)
    const saved = await savedMarker(page, label)
    expect(saved.x).toBeCloseTo(70, -0.5)
    expect(saved.y).toBeCloseTo(60, -0.5)
  })

  test("explains points it can't use", async ({ adminPage: page }) => {
    const stamp = Date.now()
    await locationWithMarkers(page, `Linie ${stamp}`, {
      [`Punkt ${stamp}`]: [30, 30],
    })
    await startReplacing(page)

    for (const [x, y] of [
      [10, 10],
      [50, 50],
      [90, 90],
    ]) {
      await clickAt(oldImage(page), x, y)
      await clickAt(newImage(page), x, y)
    }

    await expect(page.getByRole("alert")).toContainText("auf einer Linie")
    await expect(page.getByRole("button", { name: "Weiter" })).toBeDisabled()

    await page.getByRole("button", { name: "Punkt zurücknehmen" }).click()
    await expect(page.getByRole("alert")).toHaveCount(0)
    await clickAt(oldImage(page), 80, 20)
    await clickAt(newImage(page), 80, 20)
    await expect(page.getByRole("button", { name: "Weiter" })).toBeEnabled()
    // Three points work, but four are recommended
    await expect(page.getByText(/Mit 4 Punkten wird es genauer/)).toBeVisible()
  })

  test("keeps both images in view on a phone", async ({ adminPage: page }) => {
    const stamp = Date.now()
    const label = `Handy ${stamp}`
    await locationWithMarkers(page, `Klein ${stamp}`, { [label]: [30, 30] })
    await page.setViewportSize({ width: 390, height: 844 })

    await startReplacing(page)
    await setPoints(page, [5, 0])
    await page.getByRole("button", { name: "Weiter" }).click()
    await expect(page.getByText("Schritt 3 von 3")).toBeVisible()

    await expect(page.getByRole("img", { name: "Altes Bild" })).toBeInViewport({
      ratio: 1,
    })
    await expect(newImage(page)).toBeInViewport({ ratio: 1 })
    await expect(page.getByText(`Alte Position von ${label}`)).toBeInViewport()

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("keeps the simple dialog for a location without markers", async ({
    adminPage: page,
  }) => {
    const name = `Ohne ${Date.now()}`
    await page.goto("/locations")
    await addLocation(page, name)
    await choosePhoto(page)
    await page.getByRole("button", { name: "Erstellen" }).click()
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()

    await expect(page.getByRole("link", { name: "Bild ersetzen" })).toHaveCount(
      0,
    )
    await expect(
      page.getByRole("button", { name: "Bild hinzufügen" }),
    ).toBeVisible()
  })
})

test.describe("Replacing a location image by touch", () => {
  test.use({ hasTouch: true })

  test("moves a marker with a finger, right where the finger lets go", async ({
    adminPage: page,
    context,
  }) => {
    const stamp = Date.now()
    // Names of different lengths: choosing one must not shift the image
    const short = `Kurz ${stamp}`
    const long = `Ein Item mit einem wirklich sehr langen Namen, der umbricht ${stamp}`
    await locationWithMarkers(page, `Finger ${stamp}`, {
      [long]: [70, 20],
      [short]: [30, 30],
    })
    await page.setViewportSize({ width: 390, height: 844 })

    await startReplacing(page)
    await page.getByRole("button", { name: "Marker von Hand setzen" }).click()
    await expect(page.getByText("Schritt 3 von 3")).toBeVisible()
    await page
      .getByRole("list", { name: "Marker" })
      .getByRole("button", { name: long, exact: true })
      .click()

    const image = newImage(page)
    await image.evaluate((e) => e.scrollIntoView({ block: "center" }))
    const before = await image.boundingBox()
    const dot = page
      .getByRole("button", { name: short, exact: true })
      .and(page.getByTitle(short))
    const start = await dot.boundingBox()
    if (!before || !start) throw new Error("Not visible")

    // Real touch events, from the browser's input layer
    const from = {
      x: start.x + start.width / 2,
      y: start.y + start.height / 2,
    }
    const to = {
      x: before.x + before.width * 0.6,
      y: before.y + before.height * 0.6,
    }
    const touch = await context.newCDPSession(page)
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [from],
    })
    for (let step = 1; step <= 10; step++) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * step) / 10,
            y: from.y + ((to.y - from.y) * step) / 10,
          },
        ],
      })
    }
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    })

    // Choosing the marker didn't move the image under the finger
    expect((await image.boundingBox())?.y).toBe(before.y)
    await expectMarkerAt(page, short, 60, 60)
  })
})

/** Opens the marker step for a new sublocation of a location with an image */
async function startMarking(page: Page, parent: string, label: string) {
  const url = await locationWithMarkers(page, parent, {})
  await addLocation(page, label)
  await page.getByRole("button", { name: "Weiter zur Markierung" }).click()
  await expect(
    page.getByRole("heading", { name: "Position markieren" }),
  ).toBeVisible()
  const image = page.getByRole("button", { name: parent })
  await image.evaluate((e) => e.scrollIntoView({ block: "center" }))
  const box = await image.boundingBox()
  if (!box) throw new Error("The image isn't visible")
  /** A point on the image, in percent, as screen coordinates */
  const at = (x: number, y: number) => ({
    x: box.x + (box.width * x) / 100,
    y: box.y + (box.height * y) / 100,
  })
  return { at, url }
}

/** Saves the marker and returns its position on the parent's image */
async function saveMarker(page: Page, label: string, parentUrl: string) {
  await page.getByRole("button", { name: "Speichern", exact: true }).click()
  await expect(page.getByRole("heading", { name: label })).toBeVisible()
  await page.goto(parentUrl)
  return savedMarker(page, label)
}

test.describe("Placing a marker with the loupe", () => {
  test("shows the spot enlarged while the mouse is pressed and places it on release", async ({
    authenticatedPage: page,
  }) => {
    const stamp = Date.now()
    const parent = `Lupe ${stamp}`
    const label = `Fach ${stamp}`
    const { at, url } = await startMarking(page, parent, label)
    const loupe = page.getByTestId("loupe")

    const press = at(20, 60)
    await page.mouse.move(press.x, press.y)
    await page.mouse.down()
    await expect(loupe).toBeVisible()
    // Above the spot, so the hand doesn't cover it
    const box = await loupe.boundingBox()
    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThan(press.y)

    const release = at(60, 70)
    await page.mouse.move(release.x, release.y, { steps: 5 })
    await page.mouse.up()
    await expect(loupe).toHaveCount(0)

    const saved = await saveMarker(page, label, url)
    expect(saved.x).toBeCloseTo(60, -0.5)
    expect(saved.y).toBeCloseTo(70, -0.5)
  })
})

test.describe("Placing a marker with the loupe by touch", () => {
  test.use({ hasTouch: true })

  async function touch(page: Page, context: BrowserContext) {
    const session = await context.newCDPSession(page)
    const send = (
      type: "touchStart" | "touchMove" | "touchEnd",
      points: { x: number; y: number }[],
    ) => session.send("Input.dispatchTouchEvent", { type, touchPoints: points })
    return {
      start: (point: { x: number; y: number }) => send("touchStart", [point]),
      move: async (
        from: { x: number; y: number },
        to: { x: number; y: number },
      ) => {
        for (let step = 1; step <= 10; step++) {
          await send("touchMove", [
            {
              x: from.x + ((to.x - from.x) * step) / 10,
              y: from.y + ((to.y - from.y) * step) / 10,
            },
          ])
        }
      },
      end: () => send("touchEnd", []),
    }
  }

  test("holding shows the loupe, moving refines the spot", async ({
    authenticatedPage: page,
    context,
  }) => {
    const stamp = Date.now()
    const label = `Fach ${stamp}`
    await page.setViewportSize({ width: 390, height: 844 })
    const { at, url } = await startMarking(page, `Finger Lupe ${stamp}`, label)
    const finger = await touch(page, context)
    const loupe = page.getByTestId("loupe")

    await finger.start(at(30, 50))
    await expect(loupe).toBeVisible()
    await finger.move(at(30, 50), at(70, 40))
    await finger.end()
    await expect(loupe).toHaveCount(0)

    const saved = await saveMarker(page, label, url)
    expect(saved.x).toBeCloseTo(70, -0.5)
    expect(saved.y).toBeCloseTo(40, -0.5)
  })

  test("a quick swipe scrolls instead of placing", async ({
    authenticatedPage: page,
    context,
  }) => {
    const stamp = Date.now()
    await page.setViewportSize({ width: 390, height: 844 })
    const { at } = await startMarking(page, `Wisch ${stamp}`, `Fach ${stamp}`)
    const finger = await touch(page, context)

    await finger.start(at(50, 80))
    await finger.move(at(50, 80), at(50, 20))
    await finger.end()

    await expect(page.getByTestId("loupe")).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Speichern", exact: true }),
    ).toBeDisabled()
  })
})
