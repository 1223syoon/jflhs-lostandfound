// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminAccountsTable = pgTable("admin_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lostItemsTable = pgTable("lost_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemName: varchar("item_name").notNull(),
  category: varchar("category").notNull(),
  description: text("description").notNull().default(""),
  foundDate: varchar("found_date").notNull(),
  foundLocation: varchar("found_location").notNull(),
  imageUrl: text("image_url"),
  status: varchar("status").notNull().default("보관 중"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LostItem = typeof lostItemsTable.$inferSelect;
export type NewLostItem = typeof lostItemsTable.$inferInsert;