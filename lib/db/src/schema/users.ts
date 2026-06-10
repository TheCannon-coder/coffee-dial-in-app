import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  anonId: text("anon_id").unique(),
  isPro: boolean("is_pro").default(false).notNull(),
  usesThisMonth: integer("uses_this_month").default(0).notNull(),
  monthKey: text("month_key"),
  referralCode: text("referral_code").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  appleUserId: text("apple_user_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
