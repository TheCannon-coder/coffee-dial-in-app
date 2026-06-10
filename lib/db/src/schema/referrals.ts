import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  bigint,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** timestamptz shorthand — stores with time zone */
const tsz = (name: string) => timestamp(name, { withTimezone: true });

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
  /** Stripe Connect Express account for automated payouts */
  stripeConnectAccountId: text("stripe_connect_account_id"),
  connectOnboardingComplete: boolean("connect_onboarding_complete").notNull().default(false),
  /** Affiliate display name */
  name: text("name"),
  /** ISO country code — determines W-9 (US) vs W-8BEN (non-US) requirement */
  country: text("country").notNull().default("US"),
  /** 'w9' | 'w8ben' — which form was submitted */
  taxFormType: text("tax_form_type"),
  /** AES-256-GCM encrypted JSON blob of the tax form. NEVER return raw in any API response. */
  taxFormDataEnc: text("tax_form_data_enc"),
  /** True once a complete, valid tax form has been submitted */
  taxFormComplete: boolean("tax_form_complete").notNull().default(false),
  /** FTC disclosure: affiliate confirmed they'll disclose relationship in all promotional content */
  ftcDisclosureAccepted: boolean("ftc_disclosure_accepted").notNull().default(false),
  ftcAcceptedAt: tsz("ftc_accepted_at"),
  /** Running total of commissions paid in the current calendar year (cents) */
  totalPaidYtdCents: integer("total_paid_ytd_cents").notNull().default(0),
  /** Flips to true when totalPaidYtdCents crosses $600 — triggers 1099 requirement */
  requires1099: boolean("requires_1099").notNull().default(false),

  // ── International compliance ─────────────────────────────────────────────
  /**
   * Whether to withhold tax before payout.
   * Applies to AU affiliates without an ABN (ATO requires 47% withholding).
   * All others: 0% — W-8BEN certification shifts tax responsibility to affiliate.
   */
  withholdTax: boolean("withhold_tax").notNull().default(false),
  withholdTaxRatePct: integer("withhold_tax_rate_pct").notNull().default(0),
  /** GDPR consent — required for EU member state and UK affiliates */
  gdprConsent: boolean("gdpr_consent").notNull().default(false),
  gdprConsentAt: tsz("gdpr_consent_at"),
  /**
   * DAC7 reportable — true for EU member state affiliates.
   * EU Digital Services Act (DAC7) requires platforms to report seller income
   * to tax authorities when annual gross proceeds exceed EUR €2,000.
   */
  dac7Reportable: boolean("dac7_reportable").notNull().default(false),
  /** Cumulative earnings in EUR-equivalent cents for DAC7 threshold monitoring */
  totalEarnedEurEquivCents: integer("total_earned_eur_equiv_cents").notNull().default(0),

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
  planType: text("plan_type"), // monthly | annual | lifetime (null until subscribed)
  stripeSubscriptionId: text("stripe_subscription_id"),
  isSubscriptionActive: boolean("is_subscription_active")
    .notNull()
    .default(false),
  /**
   * Earliest timestamp at which this conversion's commission becomes payable.
   * Set to subscribedAt + 30 days. Commissions are only included in a payout
   * batch once this date has passed — protects against refund fraud and
   * self-referral on a second device.
   */
  payableAfter: tsz("payable_after"),
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
  /**
   * Earliest date this batch may be processed (transferred to affiliates).
   * Always set to the last day of the month following periodMonth so there
   * is always a full month between earning and payout.
   * e.g. periodMonth "2026-04" → processableAfter "2026-05-31"
   */
  processableAfter: date("processable_after"),
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
  /** Stripe Transfer ID once the payout has been sent via Connect */
  stripeTransferId: text("stripe_transfer_id"),
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

/**
 * Annual tax record snapshot — one row per (affiliate, year).
 * Created / updated by POST /api/admin/tax/reset-ytd at year end.
 * Used to generate 1099-NEC CSVs for IRS filing.
 */
export const taxRecordsTable = pgTable(
  "tax_records",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliatesTable.id),
    year: integer("year").notNull(),
    totalPaidCents: integer("total_paid_cents").notNull().default(0),
    requires1099: boolean("requires_1099").notNull().default(false),
    filedAt: tsz("filed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("tax_records_affiliate_year").on(t.affiliateId, t.year)],
);

export type TaxRecord = typeof taxRecordsTable.$inferSelect;
