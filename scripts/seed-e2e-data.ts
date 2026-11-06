/**
 * E2E Test Database Seeder
 *
 * Seeds the E2E database with consistent test data for Playwright tests.
 * Run this script inside the E2E app container after the database is ready.
 */

import fs from "node:fs"
import path from "node:path"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://e2e_user:e2e_password@postgres-e2e:5432/msb_e2e"

const pool = new pg.Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool)

// Test Users (better-auth schema)
const TEST_USERS = [
  {
    id: "e2e-admin",
    name: "E2E Admin",
    email: "e2e-admin@example.com",
    role: "admin",
  },
  {
    id: "e2e-user",
    name: "E2E Test User",
    email: "e2e-user@example.com",
    role: "user",
  },
]

// Pre-created session for e2e tests - use this token in Playwright to skip login
// This is a fixed token that the auth fixture will use
export const E2E_SESSION_TOKEN = "e2e-test-session-token-12345"
const TEST_SESSION = {
  id: "e2e-session-id",
  userId: "e2e-user",
  token: E2E_SESSION_TOKEN,
  // Session expires in 30 days
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}

// Separate session specifically for logout test - can be safely invalidated
export const E2E_LOGOUT_SESSION_TOKEN = "e2e-logout-session-token-67890"
// One more for the logout test on a phone, which runs in parallel
export const E2E_PHONE_LOGOUT_SESSION_TOKEN =
  "e2e-phone-logout-session-token-13579"
const LOGOUT_TEST_SESSIONS = [
  { id: "e2e-logout-session-id", token: E2E_LOGOUT_SESSION_TOKEN },
  {
    id: "e2e-phone-logout-session-id",
    token: E2E_PHONE_LOGOUT_SESSION_TOKEN,
  },
].map((session) => ({
  ...session,
  userId: "e2e-user",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}))

// Session for the admin user, to test admin-only actions
export const E2E_ADMIN_SESSION_TOKEN = "e2e-admin-session-token-24680"
const ADMIN_TEST_SESSION = {
  id: "e2e-admin-session-id",
  userId: "e2e-admin",
  token: E2E_ADMIN_SESSION_TOKEN,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}

// A tiny brown 40x30 PNG, so tests can check location images without
// depending on image processing in the seed
const LOCATION_IMAGE = {
  fileName: "e2e-werkbank-1.png",
  base64:
    "iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAPUlEQVRIie3VQQ0AMAwCwAlDCUqQPxnb45L+mzSUO2uezLG4Tj3hineqApnKDCSKxWCxWBwWg8VicV+xeAFKvvHdDiJYKwAAAABJRU5ErkJggg==",
}

// Hierarchical Locations (3 levels deep)
const TEST_LOCATIONS = [
  // Root Level (IDs 1-3)
  { id: 1, name: "Werkstatt", description: "Hauptwerkstatt", parentId: null },
  { id: 2, name: "Lager", description: "Materiallager", parentId: null },
  { id: 3, name: "Büro", description: "Büroraum", parentId: null },

  // Second Level (IDs 10-21)
  {
    id: 10,
    name: "Werkbank 1",
    description: "Erste Werkbank",
    parentId: 1,
    imagePath: LOCATION_IMAGE.fileName,
  },
  { id: 11, name: "Werkbank 2", description: "Zweite Werkbank", parentId: 1 },
  { id: 20, name: "Regal A", description: "Erstes Regal", parentId: 2 },
  { id: 21, name: "Regal B", description: "Zweites Regal", parentId: 2 },

  // Third Level (IDs 100-201)
  {
    id: 100,
    name: "Schublade 1",
    description: "Erste Schublade",
    parentId: 10,
  },
  {
    id: 101,
    name: "Schublade 2",
    description: "Zweite Schublade",
    parentId: 10,
  },
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
  const categories = [
    "Werkzeug",
    "Elektronik",
    "Material",
    "Fertigung",
    "Messtechnik",
  ]
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
    // 1. Truncate all tables (respecting FK order - sessions/accounts have FK to users)
    console.log("Truncating tables...")
    await db.execute(
      sql`TRUNCATE TABLE changelog, items, locations, sessions, accounts, verifications, users RESTART IDENTITY CASCADE`,
    )

    // 2. Insert users (better-auth schema)
    console.log("Inserting users...")
    for (const user of TEST_USERS) {
      await db.execute(sql`
        INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at)
        VALUES (${user.id}, ${user.name}, ${user.email}, true, ${user.role}, NOW(), NOW())
      `)
    }
    console.log(`  Inserted ${TEST_USERS.length} users`)

    // 2.5 Insert pre-created sessions for e2e-user (for fast auth in tests)
    console.log("Inserting test sessions...")
    await db.execute(sql`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
      VALUES (
        ${TEST_SESSION.id},
        ${TEST_SESSION.userId},
        ${TEST_SESSION.token},
        ${TEST_SESSION.expiresAt},
        NOW(),
        NOW()
      )
    `)
    // Separate sessions for logout tests - can be safely invalidated without affecting other tests
    for (const session of LOGOUT_TEST_SESSIONS) {
      await db.execute(sql`
        INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
        VALUES (
          ${session.id},
          ${session.userId},
          ${session.token},
          ${session.expiresAt},
          NOW(),
          NOW()
        )
      `)
    }
    console.log(`  Inserted 3 sessions for e2e-user (main + 2 logout tests)`)
    await db.execute(sql`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
      VALUES (
        ${ADMIN_TEST_SESSION.id},
        ${ADMIN_TEST_SESSION.userId},
        ${ADMIN_TEST_SESSION.token},
        ${ADMIN_TEST_SESSION.expiresAt},
        NOW(),
        NOW()
      )
    `)
    console.log(`  Inserted 1 session for e2e-admin`)

    // 3. Insert locations (with explicit IDs using OVERRIDING SYSTEM VALUE)
    console.log("Inserting locations...")
    for (const location of TEST_LOCATIONS) {
      const imagePath = "imagePath" in location ? location.imagePath : null
      await db.execute(sql`
        INSERT INTO locations (id, name, description, parent_id, image_path)
        OVERRIDING SYSTEM VALUE
        VALUES (${location.id}, ${location.name}, ${location.description}, ${location.parentId}, ${imagePath})
      `)
    }
    const locationImageDir = path.join(process.env.SAVE_PATH || "", "locations")
    fs.mkdirSync(locationImageDir, { recursive: true })
    fs.writeFileSync(
      path.join(locationImageDir, LOCATION_IMAGE.fileName),
      Buffer.from(LOCATION_IMAGE.base64, "base64"),
    )
    console.log(`  Inserted ${TEST_LOCATIONS.length} locations`)

    // Reset location sequence
    await db.execute(
      sql`SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations))`,
    )

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
    await db.execute(
      sql`SELECT setval('items_id_seq', (SELECT MAX(id) FROM items))`,
    )

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
    console.log(`  - Sessions: 3 (main + 2 logout tests)`)
    console.log(`  - Locations: ${TEST_LOCATIONS.length}`)
    console.log(`  - Items: ${TEST_ITEMS.length}`)
    console.log(`  - Changelog entries: ${TEST_CHANGELOG.length}`)
    console.log(`\nE2E Session Token: ${E2E_SESSION_TOKEN}`)
    console.log(`E2E Logout Session Token: ${E2E_LOGOUT_SESSION_TOKEN}`)
  } catch (error) {
    console.error("Seed failed:", error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
