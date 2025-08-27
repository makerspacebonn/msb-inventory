import {pgTable, serial, varchar, text, integer, json, AnyPgColumn, timestamp} from "drizzle-orm/pg-core";
import {InferInsertModel, InferSelectModel} from "drizzle-orm";

export const UserTable = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name"),
    discordId: varchar("discord_id").notNull().unique(),
    discordName: varchar("discord_name").notNull(),
    accessToken: varchar("access_token"),
    refreshToken: varchar("refresh_token"),
})

export type User = InferSelectModel<typeof UserTable>
export type UserInsert = InferInsertModel<typeof UserTable>

export const LocationTable = pgTable("locations", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name").notNull(),
    description: text("description"),
    parentId: integer("parent_id").references(() : AnyPgColumn => LocationTable.id),
    imagePath: varchar("image_path"),
    additionalInfo: json(),
})

export type LocationSelect = InferSelectModel<typeof LocationTable>
export type LocationInsert = InferInsertModel<typeof LocationTable>

export const ItemTable = pgTable("items", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    locationId: integer("location_id").references(() : AnyPgColumn => LocationTable.id),
    imagePath: varchar("image_path"),
    additionalInfo: json(),
})

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
});

export type Project = typeof projectsTable.$inferSelect
export type InsertProject = InferInsertModel<typeof projectsTable>


