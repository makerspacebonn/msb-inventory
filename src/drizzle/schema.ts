import {
  type InferInsertModel,
  type InferSelectModel,
  type SQL,
  sql,
} from "drizzle-orm"
import {
  type AnyPgColumn,
  boolean,
  customType,
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import type { ItemLink, ParentLocationMarker } from "../app/types"

const tsVector = customType<{ data: string }>({
  dataType() {
    return "tsvector"
  },
})
// better-auth required user table with admin plugin fields
export const UserTable = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: varchar("name"),
  email: varchar("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  image: varchar("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Admin plugin fields for role-based access control
  role: varchar("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: varchar("ban_reason"),
  banExpires: timestamp("ban_expires"),
})

export type User = InferSelectModel<typeof UserTable>
export type UserInsert = InferInsertModel<typeof UserTable>

// better-auth session management table
export const SessionTable = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  impersonatedBy: varchar("impersonated_by"),
})

export type Session = InferSelectModel<typeof SessionTable>
export type SessionInsert = InferInsertModel<typeof SessionTable>

// better-auth accounts table for OAuth providers and credentials
export const AccountTable = pgTable("accounts", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").notNull(),
  providerId: varchar("provider_id").notNull(), // "authentik", "credential", etc.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: varchar("scope"),
  idToken: text("id_token"),
  password: varchar("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Account = InferSelectModel<typeof AccountTable>
export type AccountInsert = InferInsertModel<typeof AccountTable>

// better-auth verifications table for email verification, password reset tokens
export const VerificationTable = pgTable("verifications", {
  id: varchar("id").primaryKey(),
  identifier: varchar("identifier").notNull(),
  value: varchar("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Verification = InferSelectModel<typeof VerificationTable>
export type VerificationInsert = InferInsertModel<typeof VerificationTable>

export const LocationTable = pgTable("locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(
    (): AnyPgColumn => LocationTable.id,
  ),
  parentLocationMarker: json().$type<ParentLocationMarker | null>(),
  imagePath: varchar("image_path"),
  additionalInfo: json().$type<null>(),
})

export type LocationSelect = InferSelectModel<typeof LocationTable>
export type LocationInsert = InferInsertModel<typeof LocationTable>

export const ItemTable = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    locationId: integer("location_id").references(
      (): AnyPgColumn => LocationTable.id,
    ),
    parentLocationMarker: json().$type<ParentLocationMarker | null>(),
    imagePath: varchar("image_path"),
    additionalInfo: json().$type<(ParentLocationMarker | ItemLink)[] | null>(),
    tags: varchar("tags").array(),
    manufacturer: varchar("manufacturer"),
    model: varchar("model"),
    category: varchar("category"),
    links: json().$type<ItemLink[] | null>(),
    morestuff: text("morestuff"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    searchVector: tsVector("search_vector", {
      dimensions: 3,
    }).generatedAlwaysAs(
      (): SQL => sql`to_tsvector('german',
           COALESCE(name, '') || ' ' ||
           COALESCE(description, '') || ' ' ||
           COALESCE(manufacturer, '') || ' ' ||
           COALESCE(model, '') || ' ' ||
           COALESCE(category, '') || ' ' ||
           COALESCE(morestuff, '')
       )`,
    ),
    searchableText: text("searchable_text").generatedAlwaysAs(
      (): SQL => sql`COALESCE(name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(manufacturer, '') || ' ' ||
            COALESCE(model, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(morestuff, '')`,
    ),
  },
  (t) => [
    index("idx_content_search").using("gin", t.searchVector),
    index("idx_searchable_text").using(
      "gin",
      t.searchableText.op("gin_trgm_ops"),
    ),
    index("items_tags_idx").using("gin", t.tags),
  ],
)

export type ItemSelect = InferSelectModel<typeof ItemTable>
export type ItemInsert = InferInsertModel<typeof ItemTable>


export const projectsTable = pgTable("projects", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }),
  leaderId: varchar({ length: 255 }).notNull(),
  guildId: varchar({ length: 255 }).notNull(),
  people: varchar({ length: 255 }).array(),
  link: varchar({ length: 255 }).array(),
  deadlineAt: timestamp(),
  doneAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp(),
})

export type Project = typeof projectsTable.$inferSelect
export type InsertProject = InferInsertModel<typeof projectsTable>

export const ChangelogTable = pgTable(
  "changelog",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 20 }).notNull(), // 'item' | 'location'
    entityId: integer("entity_id").notNull(),
    changeType: varchar("change_type", { length: 20 }).notNull(), // 'create' | 'update' | 'delete'
    userId: varchar("user_id"), // No FK constraint - allows "admin" for password login
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    beforeValues: json("before_values").$type<Record<string, unknown> | null>(),
    afterValues: json("after_values").$type<Record<string, unknown> | null>(),
    changedFields: varchar("changed_fields").array(),
  },
  (t) => [
    index("idx_changelog_entity").on(t.entityType, t.entityId),
    index("idx_changelog_changed_at").on(t.changedAt),
  ],
)

export type ChangelogSelect = InferSelectModel<typeof ChangelogTable>
export type ChangelogInsert = InferInsertModel<typeof ChangelogTable>
