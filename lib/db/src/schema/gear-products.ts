import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gearProductsTable = pgTable("gear_products", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  amazonUrl: text("amazon_url").notNull(),
  priceLabel: text("price_label").notNull(),
  brewMethods: text("brew_methods").array().notNull().default([]),
  experienceLevel: text("experience_level").notNull().default("beginner"),
  descriptionHint: text("description_hint").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGearProductSchema = createInsertSchema(gearProductsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGearProduct = z.infer<typeof insertGearProductSchema>;
export type GearProduct = typeof gearProductsTable.$inferSelect;
