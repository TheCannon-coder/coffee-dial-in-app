import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * One row per lifecycle email sent to a user. The sender joins against this
 * table so a (user, template) pair is only ever sent once, and the marketing
 * scorecard reads it to measure what a send did.
 */
export const lifecycleSendsTable = pgTable(
  "lifecycle_sends",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    template: text("template").notNull(),
    variant: text("variant"),
    status: text("status").default("sent").notNull(),
    resendId: text("resend_id"),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (t) => [index("lifecycle_sends_user_template_idx").on(t.userId, t.template)],
);

export type LifecycleSend = typeof lifecycleSendsTable.$inferSelect;
