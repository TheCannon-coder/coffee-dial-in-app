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

/**
 * Answers from the one-tap "what's held you back?" links in lifecycle emails.
 * One row per (user, template, reason) tap; an optional comment arrives on the
 * follow-up form and is relayed to the founder's inbox.
 */
export const emailFeedbackTable = pgTable(
  "email_feedback",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    template: text("template").notNull(),
    reason: text("reason").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    commentedAt: timestamp("commented_at"),
  },
  (t) => [index("email_feedback_user_template_idx").on(t.userId, t.template)],
);

export type EmailFeedback = typeof emailFeedbackTable.$inferSelect;
