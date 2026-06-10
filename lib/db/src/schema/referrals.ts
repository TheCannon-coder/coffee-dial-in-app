import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  bigint,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Affiliate registrations — one row per affiliate user.
 * Tier determines which commission rate schedule applies.
 * Tiers: standard | silver | gold | platinum
 */
export const affiliatesTable = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  tier: text("tier").notNull().default("standard"),
  audienceSize: integer("audience_size"),
  payoutEmail: text("payout_email").notNull(),
  payoutMethod: text("payout_method").notNull().default("paypal"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  /** Per-affiliate rate overrides — take priority over the phase-based tier rate when set */
  customMonthlyRateCents: integer("custom_monthly_rate_cents"),
  customAnnualRateCents: integer("custom_annual_rate_cents"),
  customLifetimeRateCents: integer("custom_lifetime_rate_cents"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Affiliate = typeof affiliatesTable.$inferSelect;

/**
 * Referral conversions — created when someone signs up via a referral code.
 * planType is null until they actually subscribe.
 * is_subscription_active flips to false on cancellation.
 */
export const referralConversionsTable = pgTable("referral_conversions", {
  id: serial("id").primaryKey(),
  referralCode: text("referral_code").notNull(),
  referrerUserId: integer("referrer_user_id")
    .notNull()
    .references(() => usersTable.id),
  referredUserId: integer("referred_user_id").references(() => usersTable.id),
  referredEmail: text("referred_email"),
  planType: text("plan_type"), // monthly | annual | lifetime (null until subscribed)
  stripeSubscriptionId: text("stripe_subscription_id"),
  isSubscriptionActive: boolean("is_subscription_active")
    .notNull()
    .default(false),
  signedUpAt: timestamp("signed_up_at").defaultNow().notNull(),
  subscribedAt: timestamp("subscribed_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export type ReferralConversion = typeof referralConversionsTable.$inferSelect;

/**
 * Payout batches — one per monthly run.
 * status: draft → approved → completed
 */
export const payoutBatchesTable = pgTable("payout_batches", {
  id: serial("id").primaryKey(),
  periodMonth: text("period_month").notNull(), // "2026-06"
  status: text("status").notNull().default("draft"),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  affiliateCount: integer("affiliate_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
});

export type PayoutBatch = typeof payoutBatchesTable.$inferSelect;

/**
 * Commission ledger — individual earned commissions.
 * commissionType: recurring (monthly plans, generated each month)
 *                 one_time (annual/lifetime, generated at subscription)
 * status: pending → approved → paid | voided
 */
export const commissionLedgerTable = pgTable("commission_ledger", {
  id: serial("id").primaryKey(),
  affiliateUserId: integer("affiliate_user_id")
    .notNull()
    .references(() => usersTable.id),
  conversionId: integer("conversion_id")
    .notNull()
    .references(() => referralConversionsTable.id),
  payoutBatchId: integer("payout_batch_id").references(
    () => payoutBatchesTable.id,
  ),
  periodMonth: text("period_month").notNull(), // "2026-06"
  planType: text("plan_type").notNull(),
  commissionType: text("commission_type").notNull(), // recurring | one_time
  amountCents: integer("amount_cents").notNull(),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

export type CommissionEntry = typeof commissionLedgerTable.$inferSelect;

/**
 * Commission rate schedule.
 * Each row is a rate for one (tier, planType) combination in a named phase.
 * Multiple rows with the same phaseName form a complete phase.
 *
 * Auto-trigger types:
 *   manual           — only activated by admin API call
 *   date             — activates when scheduledFor <= today
 *   subscriber_count — activates when total active paid subscribers >= triggerValue
 *   gross_revenue    — activates when cumulative gross revenue (cents) >= triggerValue
 *
 * The system picks the highest-phase active row per (tier, planType) as the current rate.
 */
export const commissionPhasesTable = pgTable("commission_phases", {
  id: serial("id").primaryKey(),
  phaseName: text("phase_name").notNull(),
  phaseNumber: integer("phase_number").notNull().default(1),
  tier: text("tier").notNull(),
  planType: text("plan_type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  triggerType: text("trigger_type").notNull().default("manual"),
  triggerValue: bigint("trigger_value", { mode: "number" }),
  scheduledFor: date("scheduled_for"),
  isActive: boolean("is_active").notNull().default(false),
  activatedAt: timestamp("activated_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommissionPhase = typeof commissionPhasesTable.$inferSelect;
