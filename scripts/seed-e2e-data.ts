/**
 * E2E Test Database Seeder
 *
 * Seeds the E2E database with consistent test data for Playwright tests.
 * Run this script inside the E2E app container after the database is ready.
 */

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

const DATABASE_URL = process.env.DATABASE_URL || "postgres://e2e_user:e2e_password@postgres-e2e:5432/msb_e2e"

const pool = new pg.Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool)

// Test Users
const TEST_USERS = [
  { id: "e2e-admin", name: "E2E Admin", discordId: "e2e-admin-discord", discordName: "e2e_admin" },
  { id: "e2e-user", name: "E2E User", discordId: "e2e-user-discord", discordName: "e2e_user" },
]

// Hierarchical Locations (3 levels deep)
const TEST_LOCATIONS = [
  // Root Level (IDs 1-3)
  { id: 1, name: "Werkstatt", description: "Hauptwerkstatt", parentId: null },
  { id: 2, name: "Lager", description: "Materiallager", parentId: null },
  { id: 3, name: "Büro", description: "Büroraum", parentId: null },

  // Second Level (IDs 10-21)
  { id: 10, name: "Werkbank 1", description: "Erste Werkbank", parentId: 1 },
  { id: 11, name: "Werkbank 2", description: "Zweite Werkbank", parentId: 1 },
  { id: 20, name: "Regal A", description: "Erstes Regal", parentId: 2 },
  { id: 21, name: "Regal B", description: "Zweites Regal", parentId: 2 },

  // Third Level (IDs 100-201)
  { id: 100, name: "Schublade 1", description: "Erste Schublade", parentId: 10 },
  { id: 101, name: "Schublade 2", description: "Zweite Schublade", parentId: 10 },
  { id: 200, name: "Fach A1", description: "Oberes Fach", parentId: 20 },
  { id: 201, name: "Fach A2", description: "Unteres Fach", parentId: 20 },
]

// Test Items (30+ for pagination testing)
const TEST_ITEMS = [
  {
    id: 1,
    name: "Bohrmaschine Makita",
    description: "Professionelle Schlagbohrmaschine mit 18V Akku",
    locationId: 100,
    tags: ["Werkzeug", "Elektro", "Bohren"],
    manufacturer: "Makita",
    model: "HR2470",
    category: "Elektrowerkzeug",
  },
  {
    id: 2,
    name: "Lötstation Weller",
    description: "Digitale Lötstation mit Temperaturkontrolle",
    locationId: 10,
    tags: ["Elektronik", "Löten"],
    manufacturer: "Weller",
    model: "WE1010",
    category: "Elektronik",
  },
  {
    id: 3,
    name: "Oszilloskop Rigol",
    description: "4-Kanal Digital-Oszilloskop 100MHz",
    locationId: 10,
    tags: ["Elektronik", "Messtechnik"],
    manufacturer: "Rigol",
    model: "DS1104Z",
    category: "Messtechnik",
  },
  {
    id: 4,
    name: "Multimeter Fluke",
    description: "Präzisions-Digitalmultimeter",
    locationId: 100,
    tags: ["Elektronik", "Messtechnik"],
    manufacturer: "Fluke",
    model: "87V",
    category: "Messtechnik",
  },
  {
    id: 5,
    name: "Akkuschrauber Bosch",
    description: "Kompakter Akkuschrauber für Holz und Metall",
    locationId: 101,
    tags: ["Werkzeug", "Elektro", "Schrauben"],
    manufacturer: "Bosch",
    model: "GSR 18V-28",
    category: "Elektrowerkzeug",
  },
  {
    id: 6,
    name: "3D-Drucker Prusa",
    description: "Original Prusa MK3S+ FDM 3D-Drucker",
    locationId: 11,
    tags: ["3D-Druck", "Fertigung"],
    manufacturer: "Prusa Research",
    model: "MK3S+",
    category: "3D-Druck",
  },
  {
    id: 7,
    name: "Lasercutter",
    description: "CO2-Laserschneider 60W",
    locationId: 1,
    tags: ["Laser", "Fertigung", "Schneiden"],
    manufacturer: "Thunder Laser",
    model: "Nova 35",
    category: "Lasertechnik",
  },
  {
    id: 8,
    name: "Filament PLA Schwarz",
    description: "1kg Rolle PLA Filament 1.75mm",
    locationId: 200,
    tags: ["3D-Druck", "Material"],
    manufacturer: "Prusament",
    model: "PLA Galaxy Black",
    category: "Verbrauchsmaterial",
  },
  {
    id: 9,
    name: "Schraubenset M3",
    description: "Sortiment M3 Schrauben verschiedene Längen",
    locationId: 201,
    tags: ["Hardware", "Schrauben"],
    manufacturer: "Generic",
    model: null,
    category: "Kleinteile",
  },
  {
    id: 10,
    name: "Arduino Uno R3",
    description: "Microcontroller Board ATmega328P",
    locationId: 100,
    tags: ["Elektronik", "Microcontroller", "Arduino"],
    manufacturer: "Arduino",
    model: "Uno R3",
    category: "Elektronik",
  },
]

// Generate additional items for pagination testing
for (let i = 11; i <= 35; i++) {
  const categories = ["Werkzeug", "Elektronik", "Material", "Fertigung", "Messtechnik"]
  const locations = [100, 101, 200, 201, 10, 11, 20, 21]

  TEST_ITEMS.push({
    id: i,
    name: `Test Item ${i}`,
    description: `Beschreibung für Test Item ${i}`,
    locationId: locations[i % locations.length],
    tags: [`Tag${i}`, categories[i % categories.length]],
    manufacturer: `Hersteller ${i % 5}`,
    model: `Model-${i}`,
    category: categories[i % categories.length],
  })
}

// Changelog entries for audit log testing
const TEST_CHANGELOG = [
  {
    entityType: "item",
    entityId: 1,
    changeType: "create",
    userId: "e2e-admin",
    beforeValues: null,
    afterValues: { name: "Bohrmaschine Makita", category: "Elektrowerkzeug" },
    changedFields: ["name", "description", "category"],
  },
  {
    entityType: "item",
    entityId: 2,
    changeType: "update",
    userId: "e2e-admin",
    beforeValues: { description: "Alte Beschreibung" },
    afterValues: { description: "Digitale Lötstation mit Temperaturkontrolle" },
    changedFields: ["description"],
  },
  {
    entityType: "location",
    entityId: 1,
    changeType: "create",
    userId: "e2e-admin",
    beforeValues: null,
    afterValues: { name: "Werkstatt" },
    changedFields: ["name"],
  },
]

async function seed() {
  console.log("Starting E2E database seed...")

  try {
    // 1. Truncate all tables (respecting FK order)
    console.log("Truncating tables...")
    await db.execute(sql`TRUNCATE TABLE changelog, items, locations, users, projects RESTART IDENTITY CASCADE`)

    // 2. Insert users
    console.log("Inserting users...")
    for (const user of TEST_USERS) {
      await db.execute(sql`
        INSERT INTO users (id, name, discord_id, discord_name)
        VALUES (${user.id}, ${user.name}, ${user.discordId}, ${user.discordName})
      `)
    }
    console.log(`  Inserted ${TEST_USERS.length} users`)

    // 3. Insert locations (with explicit IDs using OVERRIDING SYSTEM VALUE)
    console.log("Inserting locations...")
    for (const location of TEST_LOCATIONS) {
      await db.execute(sql`
        INSERT INTO locations (id, name, description, parent_id)
        OVERRIDING SYSTEM VALUE
        VALUES (${location.id}, ${location.name}, ${location.description}, ${location.parentId})
      `)
    }
    console.log(`  Inserted ${TEST_LOCATIONS.length} locations`)

    // Reset location sequence
    await db.execute(sql`SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations))`)

    // 4. Insert items
    console.log("Inserting items...")
    for (const item of TEST_ITEMS) {
      const tagsArray = `{${item.tags.join(",")}}`
      await db.execute(sql`
        INSERT INTO items (id, name, description, location_id, tags, manufacturer, model, category, created_at)
        VALUES (
          ${item.id},
          ${item.name},
          ${item.description},
          ${item.locationId},
          ${tagsArray}::varchar[],
          ${item.manufacturer},
          ${item.model},
          ${item.category},
          NOW() - INTERVAL '1 day' * ${Math.floor(Math.random() * 60)}
        )
      `)
    }
    console.log(`  Inserted ${TEST_ITEMS.length} items`)

    // Reset item sequence
    await db.execute(sql`SELECT setval('items_id_seq', (SELECT MAX(id) FROM items))`)

    // 5. Insert changelog entries
    console.log("Inserting changelog entries...")
    for (const entry of TEST_CHANGELOG) {
      const changedFieldsArray = `{${entry.changedFields.join(",")}}`
      await db.execute(sql`
        INSERT INTO changelog (entity_type, entity_id, change_type, user_id, before_values, after_values, changed_fields, changed_at)
        VALUES (
          ${entry.entityType},
          ${entry.entityId},
          ${entry.changeType},
          ${entry.userId},
          ${JSON.stringify(entry.beforeValues)}::json,
          ${JSON.stringify(entry.afterValues)}::json,
          ${changedFieldsArray}::varchar[],
          NOW() - INTERVAL '1 hour' * ${Math.floor(Math.random() * 48)}
        )
      `)
    }
    console.log(`  Inserted ${TEST_CHANGELOG.length} changelog entries`)

    console.log("\nE2E database seed completed successfully!")
    console.log(`Summary:`)
    console.log(`  - Users: ${TEST_USERS.length}`)
    console.log(`  - Locations: ${TEST_LOCATIONS.length}`)
    console.log(`  - Items: ${TEST_ITEMS.length}`)
    console.log(`  - Changelog entries: ${TEST_CHANGELOG.length}`)
  } catch (error) {
    console.error("Seed failed:", error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
