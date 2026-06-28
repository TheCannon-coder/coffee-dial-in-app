import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const androidWaitlistTable = pgTable("android_waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  platform: text("platform").default("android").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAndroidWaitlistSchema = createInsertSchema(
  androidWaitlistTable,
).omit({ id: true, createdAt: true });
export type InsertAndroidWaitlist = z.infer<typeof insertAndroidWaitlistSchema>;
export type AndroidWaitlist = typeof androidWaitlistTable.$inferSelect;
