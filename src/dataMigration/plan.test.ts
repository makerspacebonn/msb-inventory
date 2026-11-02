import { describe, expect, it } from "vitest"
import { type MigrationItem, planMigration } from "./plan"

const item = (overrides: Partial<MigrationItem>): MigrationItem => ({
  id: 1,
  name: "Item",
  category: null,
  tags: [],
  manufacturer: null,
  ...overrides,
})

describe("planMigration", () => {
  it("maps old categories case-insensitively and ignores whitespace", () => {
    const plan = planMigration([
      item({ id: 1, category: "Elektronikmodul" }),
      item({ id: 2, category: " elektronik-modul " }),
    ])
    expect(plan.changes.map((c) => c.after.category)).toEqual([
      "Elektronik-Module & Sensoren",
      "Elektronik-Module & Sensoren",
    ])
  })

  it("keeps unknown categories and reports them", () => {
    const plan = planMigration([item({ category: "Raumfahrt" })])
    expect(plan.changes).toEqual([])
    expect(plan.unknownCategories).toEqual([{ name: "Raumfahrt", count: 1 }])
    expect(plan.categories).toContain("Raumfahrt")
  })

  it("applies an item override only when id, name and old category match", () => {
    const plan = planMigration([
      item({
        id: 1388,
        name: "Batteriehalter 2xAA",
        category: "Elektronikkomponente",
      }),
    ])
    expect(plan.changes[0].after.category).toBe("Stromversorgung & Akkus")
    expect(plan.changes[0].viaOverride).toBe(true)
  })

  it("skips an override for a different item with the same id", () => {
    const plan = planMigration([
      item({
        id: 1388,
        name: "Something else",
        category: "Elektronikkomponente",
      }),
    ])
    expect(plan.changes[0].after.category).toBe("Elektronik-Module & Sensoren")
    expect(plan.changes[0].viaOverride).toBe(false)
    expect(
      plan.skippedOverrides.find((s) => s.override.id === 1388)?.reason,
    ).toMatch(/Name passt nicht/)
  })

  it("cleans tags using old and new category as redundant values", () => {
    const plan = planMigration([
      item({
        category: "Elektronikmodul",
        tags: ["Elektronikmodul", "Schwarz", "I2C", "Elektronik"],
      }),
    ])
    expect(plan.changes[0].after.tags).toEqual(["I2C"])
    expect(plan.changes[0].removedTags).toEqual([
      "Elektronikmodul",
      "Schwarz",
      "Elektronik",
    ])
  })

  it("changes nothing when run on already migrated data", () => {
    const first = planMigration([
      item({ id: 1, category: "Elektronikmodul", tags: ["E-BLOCK", "Rot"] }),
      item({ id: 2, category: "Sensor", tags: ["E-Block", "E-Block"] }),
    ])
    const migrated = first.changes.map((c) =>
      item({ id: c.id, category: c.after.category, tags: c.after.tags }),
    )
    expect(planMigration(migrated).changes).toEqual([])
  })
})
