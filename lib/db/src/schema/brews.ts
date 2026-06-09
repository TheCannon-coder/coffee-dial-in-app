import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const brewsTable = pgTable("brews", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").references(() => usersTable.id),

  sessionId: text("session_id"),

  method: text("method"),
  coffeeName: text("coffee_name"),
  dose: text("dose"),
  water: text("water"),
  brewTime: text("brew_time"),
  waterTemp: text("water_temp"),
  grinderNotes: text("grinder_notes"),
  tastingNotes: text("tasting_notes").notNull(),
  freeNotes: text("free_notes"),
  adjustmentHistory: text("adjustment_history").array(),

  advice: text("advice").notNull(),
  adjustment: text("adjustment").notNull(),
  aiModel: text("ai_model"),

  comparedToPrevious: text("compared_to_previous"),

  wasHelpful: boolean("was_helpful"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBrewSchema = createInsertSchema(brewsTable).omit({ id: true, createdAt: true });
export type InsertBrew = z.infer<typeof insertBrewSchema>;
export type Brew = typeof brewsTable.$inferSelect;
