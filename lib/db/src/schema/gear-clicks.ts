import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const gearClicksTable = pgTable("gear_clicks", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  ipHash: text("ip_hash"), // SHA-256 of IP — for deduplication, not tracking
  userAgent: text("user_agent"),
  source: text("source").notNull().default("direct"), // 'recommendation' | 'direct'
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
});

export type GearClick = typeof gearClicksTable.$inferSelect;
