import {
  type InferInsertModel,
  type InferSelectModel,
  type SQL,
  sql,
} from "drizzle-orm"
import {
  type AnyPgColumn,
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
export const UserTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name"),
  discordId: varchar("discord_id").notNull().unique(),
  discordName: varchar("discord_name").unique(),
})

export type User = InferSelectModel<typeof UserTable>
export type UserInsert = InferInsertModel<typeof UserTable>

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
