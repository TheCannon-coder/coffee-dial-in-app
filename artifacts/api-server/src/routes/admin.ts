/**
 * Admin API — all routes protected by X-Admin-Key header.
 * Set ADMIN_KEY env var to a strong secret before exposing to the internet.
 *
 * Affiliates:
 *   GET    /api/admin/affiliates              list with earnings summary
 *   POST   /api/admin/affiliates              create affiliate
 *   GET    /api/admin/affiliates/:id          detail with conversions
 *   PATCH  /api/admin/affiliates/:id          update tier / payout info
 *   POST   /api/admin/affiliates/:id/set-code assign custom referral code
 *
 * Conversions:
 *   GET    /api/admin/conversions             list all referral conversions
 *   POST   /api/admin/conversions/:id/subscribe  mark subscribed (creates commission)
 *   POST   /api/admin/conversions/:id/cancel     cancel subscription
 *
 * Payouts:
 *   GET    /api/admin/payouts                 list batches
 *   POST   /api/admin/payouts/generate        generate draft batch for a month
 *   GET    /api/admin/payouts/:id             batch detail + line items (CSV-ready)
 *   POST   /api/admin/payouts/:id/approve     approve batch
 *   POST   /api/admin/payouts/:id/complete    mark as sent / completed
 *
 * Rates:
 *   GET    /api/admin/rates                   list all phases
 *   GET    /api/admin/rates/current           current active rate per tier+planType
 *   POST   /api/admin/rates/phase             add a new phase (can set triggers)
 *   POST   /api/admin/rates/check-triggers    auto-activate phases whose triggers fired
 */

import { Router } from "express";
import { eq, and, desc, sql, inArray, isNull, lte, or } from "drizzle-orm";
import { usdCentsToEurCents, isEuMemberState } from "../lib/compliance-utils";
import { db, usersTable } from "@workspace/db";
import {
  affiliatesTable,
  referralConversionsTable,
  commissionLedgerTable,
  payoutBatchesTable,
  commissionPhasesTable,
  taxRecordsTable,
} from "@workspace/db";
import { getStripe } from "../lib/stripe";
import { logger } from "../lib/logger";

const router = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────

router.use((req, res, next) => {
  const key = req.headers["x-admin-key"];
  const expected = process.env["ADMIN_KEY"];
  if (!expected) {
    res.status(503).json({ error: "admin_not_configured" });
    return;
  }
  if (!key || key !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns the previous calendar month as "YYYY-MM".
 * Used as the default period when generating a payout batch so that running
 * the job at the end of month M automatically covers month M-1 commissions.
 */
function previousMonth(): string {
  const d = new Date();
  const m = d.getMonth(); // 0-indexed
  if (m === 0) return `${d.getFullYear() - 1}-12`;
  return `${d.getFullYear()}-${String(m).padStart(2, "0")}`;
}

/**
 * Returns the last calendar day of the month following periodMonth.
 * This is the earliest date a batch may be processed — enforcing the rule
 * that affiliates are always paid one full month after they earn commissions.
 *
 * Examples:
 *   "2026-04" → "2026-05-31"  (April earnings paid no sooner than May 31)
 *   "2026-12" → "2027-01-31"  (December earnings paid no sooner than Jan 31)
 */
function calcProcessableAfter(periodMonth: string): string {
  const [year, month] = periodMonth.split("-").map(Number);
  // new Date(year, month+1, 0) = last day of month (month is 1-indexed here,
  // Date months are 0-indexed, so month+1 in Date = month+2 calendar month,
  // and day 0 of that = last day of month+1).
  const d = new Date(year, month + 1, 0);
  return d.toISOString().split("T")[0]!;
}

async function getCurrentRates(): Promise<
  Record<string, Record<string, number>>
> {
  const phases = await db
    .select()
    .from(commissionPhasesTable)
    .where(eq(commissionPhasesTable.isActive, true))
    .orderBy(desc(commissionPhasesTable.phaseNumber));

  const rates: Record<string, Record<string, number>> = {};
  for (const p of phases) {
    if (!rates[p.tier]) rates[p.tier] = {};
    if (!rates[p.tier][p.planType]) {
      rates[p.tier][p.planType] = p.amountCents;
    }
  }
  return rates;
}

/**
 * Resolve the commission rate for one affiliate + plan type.
 * Custom rate on the affiliate wins over the global phase rate.
 * Returns rate in cents.
 */
function resolveRateCents(
  affiliate: {
    tier: string;
    customMonthlyRateCents: number | null;
    customAnnualRateCents: number | null;
    customLifetimeRateCents: number | null;
  },
  planType: string,
  globalRates: Record<string, Record<string, number>>,
): number {
  const customMap: Record<string, number | null> = {
    monthly: affiliate.customMonthlyRateCents,
    annual: affiliate.customAnnualRateCents,
    lifetime: affiliate.customLifetimeRateCents,
  };
  const custom = customMap[planType];
  if (custom !== null && custom !== undefined) return custom;
  return globalRates[affiliate.tier]?.[planType] ?? 75;
}

type AffiliateWithRates = {
  id: number;
  tier: string;
  customMonthlyRateCents: number | null;
  customAnnualRateCents: number | null;
  customLifetimeRateCents: number | null;
};

/**
 * On an affiliate's first subscription event, permanently lock their commission
 * rates to the phase that was active at that moment.  Subsequent phase changes
 * won't affect them — they keep earning the rate they were promised when they
 * first drove a subscriber.  Returns the affiliate record (possibly updated).
 *
 * If the affiliate already has rates locked (any non-null custom column) this
 * is a no-op, so it's safe to call on every subscribe event.
 */
async function ensureRatesLocked(
  affiliate: AffiliateWithRates,
  globalRates: Record<string, Record<string, number>>,
): Promise<AffiliateWithRates> {
  const alreadyLocked =
    affiliate.customMonthlyRateCents !== null ||
    affiliate.customAnnualRateCents !== null ||
    affiliate.customLifetimeRateCents !== null;

  if (alreadyLocked) return affiliate;

  const tierRates = globalRates[affiliate.tier] ?? {};
  const monthly = tierRates["monthly"] ?? 75;
  const annual = tierRates["annual"] ?? 0;
  const lifetime = tierRates["lifetime"] ?? 0;

  const [updated] = await db
    .update(affiliatesTable)
    .set({
      customMonthlyRateCents: monthly,
      customAnnualRateCents: annual,
      customLifetimeRateCents: lifetime,
    })
    .where(eq(affiliatesTable.id, affiliate.id))
    .returning();

  return updated;
}

// ── Affiliates ─────────────────────────────────────────────────────────────────

router.get("/admin/affiliates", async (req, res) => {
  try {
    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        userId: affiliatesTable.userId,
        email: usersTable.email,
        referralCode: usersTable.referralCode,
        tier: affiliatesTable.tier,
        audienceSize: affiliatesTable.audienceSize,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        isActive: affiliatesTable.isActive,
        notes: affiliatesTable.notes,
        createdAt: affiliatesTable.createdAt,
      })
      .from(affiliatesTable)
      .innerJoin(usersTable, eq(affiliatesTable.userId, usersTable.id))
      .orderBy(desc(affiliatesTable.createdAt));

    const summaries = await Promise.all(
      affiliates.map(async (a) => {
        const [totals] = await db
          .select({
            totalEarnedCents: sql<number>`coalesce(sum(amount_cents),0)::int`,
            paidCents: sql<number>`coalesce(sum(case when status='paid' then amount_cents else 0 end),0)::int`,
            pendingCents: sql<number>`coalesce(sum(case when status='pending' then amount_cents else 0 end),0)::int`,
            conversionCount: sql<number>`count(distinct conversion_id)::int`,
          })
          .from(commissionLedgerTable)
          .where(eq(commissionLedgerTable.affiliateUserId, a.userId));

        return { ...a, ...totals };
      }),
    );

    res.json(summaries);
  } catch (err) {
    logger.error({ err }, "admin/affiliates list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/affiliates", async (req, res) => {
  const {
    email,
    userId: rawUserId,
    tier = "standard",
    audienceSize,
    payoutEmail,
    payoutMethod = "paypal",
    notes,
  } = req.body as {
    email?: string;
    userId?: number;
    tier?: string;
    audienceSize?: number;
    payoutEmail?: string;
    payoutMethod?: string;
    notes?: string;
  };

  if (!payoutEmail) {
    res.status(400).json({ error: "payoutEmail required" });
    return;
  }

  try {
    let userId = rawUserId;
    if (!userId && email) {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, email),
      });
      if (!user) {
        res.status(404).json({ error: "user not found" });
        return;
      }
      userId = user.id;
    }
    if (!userId) {
      res.status(400).json({ error: "email or userId required" });
      return;
    }

    const existing = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });
    if (existing) {
      res.status(409).json({ error: "affiliate already exists", id: existing.id });
      return;
    }

    const [affiliate] = await db
      .insert(affiliatesTable)
      .values({ userId, tier, audienceSize, payoutEmail, payoutMethod, notes })
      .returning();

    res.status(201).json(affiliate);
  } catch (err) {
    logger.error({ err }, "admin/affiliates create error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/admin/affiliates/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [affiliate] = await db
      .select({
        id: affiliatesTable.id,
        userId: affiliatesTable.userId,
        email: usersTable.email,
        referralCode: usersTable.referralCode,
        tier: affiliatesTable.tier,
        audienceSize: affiliatesTable.audienceSize,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        isActive: affiliatesTable.isActive,
        notes: affiliatesTable.notes,
        createdAt: affiliatesTable.createdAt,
      })
      .from(affiliatesTable)
      .innerJoin(usersTable, eq(affiliatesTable.userId, usersTable.id))
      .where(eq(affiliatesTable.id, id));

    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const conversions = await db
      .select()
      .from(referralConversionsTable)
      .where(eq(referralConversionsTable.referrerUserId, affiliate.userId))
      .orderBy(desc(referralConversionsTable.signedUpAt));

    const ledger = await db
      .select()
      .from(commissionLedgerTable)
      .where(eq(commissionLedgerTable.affiliateUserId, affiliate.userId))
      .orderBy(desc(commissionLedgerTable.createdAt));

    res.json({ ...affiliate, conversions, ledger });
  } catch (err) {
    logger.error({ err }, "admin/affiliates get error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/admin/affiliates/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const {
    tier,
    audienceSize,
    payoutEmail,
    payoutMethod,
    isActive,
    notes,
    customMonthlyRateCents,
    customAnnualRateCents,
    customLifetimeRateCents,
  } = req.body as {
    tier?: string;
    audienceSize?: number;
    payoutEmail?: string;
    payoutMethod?: string;
    isActive?: boolean;
    notes?: string;
    customMonthlyRateCents?: number | null;
    customAnnualRateCents?: number | null;
    customLifetimeRateCents?: number | null;
  };

  try {
    const updates: Partial<typeof affiliatesTable.$inferInsert> = {};
    if (tier !== undefined) updates.tier = tier;
    if (audienceSize !== undefined) updates.audienceSize = audienceSize;
    if (payoutEmail !== undefined) updates.payoutEmail = payoutEmail;
    if (payoutMethod !== undefined) updates.payoutMethod = payoutMethod;
    if (isActive !== undefined) updates.isActive = isActive;
    if (notes !== undefined) updates.notes = notes;
    if (customMonthlyRateCents !== undefined) updates.customMonthlyRateCents = customMonthlyRateCents;
    if (customAnnualRateCents !== undefined) updates.customAnnualRateCents = customAnnualRateCents;
    if (customLifetimeRateCents !== undefined) updates.customLifetimeRateCents = customLifetimeRateCents;

    const [updated] = await db
      .update(affiliatesTable)
      .set(updates)
      .where(eq(affiliatesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/affiliates update error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Set custom commission rates for one affiliate.
 * Pass null for a plan type to remove the override and fall back to the tier rate.
 * Example: { "monthlyRateCents": 125, "annualRateCents": null, "lifetimeRateCents": null }
 */
router.post("/admin/affiliates/:id/set-rates", async (req, res) => {
  const id = Number(req.params["id"]);
  const { monthlyRateCents, annualRateCents, lifetimeRateCents } = req.body as {
    monthlyRateCents?: number | null;
    annualRateCents?: number | null;
    lifetimeRateCents?: number | null;
  };

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const updates: Partial<typeof affiliatesTable.$inferInsert> = {};
    if (monthlyRateCents !== undefined) updates.customMonthlyRateCents = monthlyRateCents;
    if (annualRateCents !== undefined) updates.customAnnualRateCents = annualRateCents;
    if (lifetimeRateCents !== undefined) updates.customLifetimeRateCents = lifetimeRateCents;

    const [updated] = await db
      .update(affiliatesTable)
      .set(updates)
      .where(eq(affiliatesTable.id, id))
      .returning();

    const globalRates = await getCurrentRates();
    res.json({
      affiliate: updated,
      effectiveRates: {
        monthly: resolveRateCents(updated, "monthly", globalRates),
        annual: resolveRateCents(updated, "annual", globalRates),
        lifetime: resolveRateCents(updated, "lifetime", globalRates),
      },
    });
  } catch (err) {
    logger.error({ err }, "admin/affiliates set-rates error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/affiliates/:id/set-code", async (req, res) => {
  const id = Number(req.params["id"]);
  const { code } = req.body as { code?: string };

  if (!code || !/^[A-Z0-9]{3,20}$/.test(code)) {
    res
      .status(400)
      .json({ error: "code must be 3-20 uppercase alphanumeric characters" });
    return;
  }

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const conflict = await db.query.usersTable.findFirst({
      where: eq(usersTable.referralCode, code),
    });
    if (conflict && conflict.id !== affiliate.userId) {
      res.status(409).json({ error: "code_already_in_use" });
      return;
    }

    await db
      .update(usersTable)
      .set({ referralCode: code })
      .where(eq(usersTable.id, affiliate.userId));

    res.json({ code });
  } catch (err) {
    logger.error({ err }, "admin/affiliates set-code error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Conversions ────────────────────────────────────────────────────────────────

router.get("/admin/conversions", async (req, res) => {
  try {
    const conversions = await db
      .select()
      .from(referralConversionsTable)
      .orderBy(desc(referralConversionsTable.signedUpAt));
    res.json(conversions);
  } catch (err) {
    logger.error({ err }, "admin/conversions list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/conversions/:id/subscribe", async (req, res) => {
  const id = Number(req.params["id"]);
  const { planType, stripeSubscriptionId } = req.body as {
    planType?: string;
    stripeSubscriptionId?: string;
  };

  if (!planType || !["monthly", "annual", "lifetime"].includes(planType)) {
    res.status(400).json({ error: "planType must be monthly|annual|lifetime" });
    return;
  }

  try {
    const conversion = await db.query.referralConversionsTable.findFirst({
      where: eq(referralConversionsTable.id, id),
    });
    if (!conversion) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (conversion.isSubscriptionActive) {
      res.status(409).json({ error: "already_subscribed" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, conversion.referrerUserId),
    });
    if (!affiliate) {
      res.status(400).json({ error: "referrer is not a registered affiliate" });
      return;
    }

    const now = new Date();
    const periodMonth = currentMonth();

    // payableAfter = 30 days after subscription — protects against refund fraud
    const payableAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db
      .update(referralConversionsTable)
      .set({
        planType,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        isSubscriptionActive: true,
        subscribedAt: now,
        payableAfter,
      })
      .where(eq(referralConversionsTable.id, id));

    // Lock this affiliate's rates to the current phase if this is their first
    // ever subscription — guarantees they always earn at the rate they were
    // promised when they first drove a paying user, regardless of future phases.
    const rates = await getCurrentRates();
    const lockedAffiliate = await ensureRatesLocked(affiliate, rates);

    // For annual and lifetime: generate a one-time commission immediately
    let ledgerEntry = null;
    if (planType === "annual" || planType === "lifetime") {
      const amountCents = resolveRateCents(lockedAffiliate, planType, rates);

      if (amountCents > 0) {
        const [entry] = await db
          .insert(commissionLedgerTable)
          .values({
            affiliateUserId: affiliate.userId,
            conversionId: id,
            periodMonth,
            planType,
            commissionType: "one_time",
            amountCents,
            tier: affiliate.tier,
            status: "pending",
          })
          .returning();
        ledgerEntry = entry;
      }
    }

    res.json({
      conversion: { ...conversion, planType, isSubscriptionActive: true },
      ledgerEntry,
    });
  } catch (err) {
    logger.error({ err }, "admin/conversions subscribe error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/conversions/:id/cancel", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [updated] = await db
      .update(referralConversionsTable)
      .set({ isSubscriptionActive: false, cancelledAt: new Date() })
      .where(eq(referralConversionsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/conversions cancel error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Payouts ────────────────────────────────────────────────────────────────────

router.get("/admin/payouts", async (req, res) => {
  try {
    const batches = await db
      .select()
      .from(payoutBatchesTable)
      .orderBy(desc(payoutBatchesTable.createdAt));
    res.json(batches);
  } catch (err) {
    logger.error({ err }, "admin/payouts list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/payouts/generate", async (req, res) => {
  // Default to the PREVIOUS month so that running this job at end-of-month M
  // automatically covers month M-1 commissions, enforcing the 1-month delay.
  const { periodMonth = previousMonth(), notes } = req.body as {
    periodMonth?: string;
    notes?: string;
  };

  if (!/^\d{4}-\d{2}$/.test(periodMonth)) {
    res.status(400).json({ error: "periodMonth must be YYYY-MM" });
    return;
  }

  try {
    // Check for existing non-draft batch
    const existing = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.periodMonth, periodMonth),
    });
    if (existing && existing.status !== "draft") {
      res.status(409).json({
        error: "batch_already_exists",
        status: existing.status,
        id: existing.id,
      });
      return;
    }

    const rates = await getCurrentRates();

    // Find all active monthly referral conversions (include custom rate columns)
    const activeMonthly = await db
      .select({
        conversionId: referralConversionsTable.id,
        referrerUserId: referralConversionsTable.referrerUserId,
        affiliateId: affiliatesTable.id,
        tier: affiliatesTable.tier,
        customMonthlyRateCents: affiliatesTable.customMonthlyRateCents,
        customAnnualRateCents: affiliatesTable.customAnnualRateCents,
        customLifetimeRateCents: affiliatesTable.customLifetimeRateCents,
        affiliatePayoutEmail: affiliatesTable.payoutEmail,
        affiliatePayoutMethod: affiliatesTable.payoutMethod,
      })
      .from(referralConversionsTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, referralConversionsTable.referrerUserId),
      )
      .where(
        and(
          eq(referralConversionsTable.planType, "monthly"),
          eq(referralConversionsTable.isSubscriptionActive, true),
          eq(affiliatesTable.isActive, true),
          // Only include conversions that have passed the 30-day hold
          or(
            isNull(referralConversionsTable.payableAfter),
            lte(referralConversionsTable.payableAfter, sql`NOW()`),
          ),
        ),
      );

    // Find already-created ledger entries for this month to avoid duplicates
    const existingEntries = await db
      .select({ conversionId: commissionLedgerTable.conversionId })
      .from(commissionLedgerTable)
      .where(
        and(
          eq(commissionLedgerTable.periodMonth, periodMonth),
          eq(commissionLedgerTable.commissionType, "recurring"),
        ),
      );
    const existingConversionIds = new Set(
      existingEntries.map((e) => e.conversionId),
    );

    // Create ledger entries for any that don't have one yet
    const newEntries = activeMonthly.filter(
      (c) => !existingConversionIds.has(c.conversionId),
    );

    if (newEntries.length > 0) {
      // Lock rates for any affiliate who hasn't had a subscription event yet
      // (edge case: monthly subscriber added without going through /subscribe).
      const lockedEntries = await Promise.all(
        newEntries.map(async (c) => ({
          ...c,
          locked: await ensureRatesLocked(
            {
              id: c.affiliateId,
              tier: c.tier,
              customMonthlyRateCents: c.customMonthlyRateCents,
              customAnnualRateCents: c.customAnnualRateCents,
              customLifetimeRateCents: c.customLifetimeRateCents,
            },
            rates,
          ),
        })),
      );

      await db.insert(commissionLedgerTable).values(
        lockedEntries.map(({ locked, conversionId, referrerUserId, tier }) => ({
          affiliateUserId: referrerUserId,
          conversionId,
          periodMonth,
          planType: "monthly",
          commissionType: "recurring",
          amountCents: resolveRateCents(locked, "monthly", rates),
          tier,
          status: "pending",
        })),
      );
    }

    // Also include any previously created but unpaid entries for this period
    const allPeriodEntries = await db
      .select({
        id: commissionLedgerTable.id,
        affiliateUserId: commissionLedgerTable.affiliateUserId,
        conversionId: commissionLedgerTable.conversionId,
        periodMonth: commissionLedgerTable.periodMonth,
        planType: commissionLedgerTable.planType,
        commissionType: commissionLedgerTable.commissionType,
        amountCents: commissionLedgerTable.amountCents,
        tier: commissionLedgerTable.tier,
        status: commissionLedgerTable.status,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        affiliateEmail: usersTable.email,
      })
      .from(commissionLedgerTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, commissionLedgerTable.affiliateUserId),
      )
      .innerJoin(
        usersTable,
        eq(usersTable.id, commissionLedgerTable.affiliateUserId),
      )
      .where(
        and(
          eq(commissionLedgerTable.periodMonth, periodMonth),
          eq(commissionLedgerTable.status, "pending"),
        ),
      );

    const totalAmountCents = allPeriodEntries.reduce(
      (sum, e) => sum + e.amountCents,
      0,
    );
    const uniqueAffiliates = new Set(
      allPeriodEntries.map((e) => e.affiliateUserId),
    );

    // Create or update the draft batch
    const processableAfter = calcProcessableAfter(periodMonth);
    let batch;
    if (existing) {
      const [updated] = await db
        .update(payoutBatchesTable)
        .set({
          totalAmountCents,
          affiliateCount: uniqueAffiliates.size,
          notes: notes ?? existing.notes,
          processableAfter,
        })
        .where(eq(payoutBatchesTable.id, existing.id))
        .returning();
      batch = updated;
    } else {
      const [created] = await db
        .insert(payoutBatchesTable)
        .values({
          periodMonth,
          totalAmountCents,
          affiliateCount: uniqueAffiliates.size,
          notes,
          processableAfter,
        })
        .returning();
      batch = created;
    }

    // Link ledger entries to the batch
    if (allPeriodEntries.length > 0) {
      await db
        .update(commissionLedgerTable)
        .set({ payoutBatchId: batch.id })
        .where(
          and(
            eq(commissionLedgerTable.periodMonth, periodMonth),
            eq(commissionLedgerTable.status, "pending"),
          ),
        );
    }

    res.json({
      batch,
      lineItems: allPeriodEntries,
      newEntriesCreated: newEntries.length,
    });
  } catch (err) {
    logger.error({ err }, "admin/payouts generate error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/admin/payouts/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const lineItems = await db
      .select({
        ledgerId: commissionLedgerTable.id,
        affiliateUserId: commissionLedgerTable.affiliateUserId,
        affiliateEmail: usersTable.email,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        tier: commissionLedgerTable.tier,
        conversionId: commissionLedgerTable.conversionId,
        periodMonth: commissionLedgerTable.periodMonth,
        planType: commissionLedgerTable.planType,
        commissionType: commissionLedgerTable.commissionType,
        amountCents: commissionLedgerTable.amountCents,
        amountDollars: sql<string>`(amount_cents / 100.0)::numeric(10,2)`,
        status: commissionLedgerTable.status,
      })
      .from(commissionLedgerTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, commissionLedgerTable.affiliateUserId),
      )
      .innerJoin(
        usersTable,
        eq(usersTable.id, commissionLedgerTable.affiliateUserId),
      )
      .where(eq(commissionLedgerTable.payoutBatchId, id))
      .orderBy(affiliatesTable.payoutEmail);

    // Aggregate by affiliate for the payout summary
    const byAffiliate: Record<
      string,
      { payoutEmail: string; payoutMethod: string; totalCents: number; entries: typeof lineItems }
    > = {};
    for (const item of lineItems) {
      const key = item.payoutEmail;
      if (!byAffiliate[key]) {
        byAffiliate[key] = {
          payoutEmail: item.payoutEmail,
          payoutMethod: item.payoutMethod,
          totalCents: 0,
          entries: [],
        };
      }
      byAffiliate[key].totalCents += item.amountCents;
      byAffiliate[key].entries.push(item);
    }

    res.json({
      batch,
      lineItems,
      payoutSummary: Object.values(byAffiliate).map((a) => ({
        payoutEmail: a.payoutEmail,
        payoutMethod: a.payoutMethod,
        totalCents: a.totalCents,
        totalDollars: (a.totalCents / 100).toFixed(2),
        entryCount: a.entries.length,
      })),
    });
  } catch (err) {
    logger.error({ err }, "admin/payouts get error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/payouts/:id/approve", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (batch.status !== "draft") {
      res.status(409).json({ error: "batch_not_in_draft", status: batch.status });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(payoutBatchesTable)
      .set({ status: "approved", approvedAt: now })
      .where(eq(payoutBatchesTable.id, id))
      .returning();

    await db
      .update(commissionLedgerTable)
      .set({ status: "approved" })
      .where(
        and(
          eq(commissionLedgerTable.payoutBatchId, id),
          eq(commissionLedgerTable.status, "pending"),
        ),
      );

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/payouts approve error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/admin/payouts/:id/process
 *
 * Executes real Stripe Connect transfers for every approved ledger entry in a
 * batch. Entries are grouped by affiliate; one transfer is created per affiliate
 * (to minimise Stripe fees).
 *
 * Affiliates without a completed Connect account are skipped and left in
 * "approved" status — call /complete afterward to mark the batch done after
 * handling those manually.
 *
 * Idempotent: entries already in "paid" status are ignored.
 */
router.post("/admin/payouts/:id/process", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const stripe = getStripe();

    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (batch.status !== "approved") {
      res.status(409).json({ error: "batch_must_be_approved_first", status: batch.status });
      return;
    }

    // Enforce 1-month delay: commissions earned in month M cannot be paid
    // until the last day of month M+1 to ensure funds are always in hand.
    if (batch.processableAfter) {
      const today = new Date().toISOString().split("T")[0]!;
      if (today < batch.processableAfter) {
        res.status(409).json({
          error: "too_early",
          message: `This batch covers ${batch.periodMonth} commissions and cannot be processed before ${batch.processableAfter}.`,
          processableAfter: batch.processableAfter,
        });
        return;
      }
    }

    // Load approved ledger entries with affiliate Connect + compliance details
    const entries = await db
      .select({
        ledgerId: commissionLedgerTable.id,
        affiliateUserId: commissionLedgerTable.affiliateUserId,
        amountCents: commissionLedgerTable.amountCents,
        stripeConnectAccountId: affiliatesTable.stripeConnectAccountId,
        connectOnboardingComplete: affiliatesTable.connectOnboardingComplete,
        taxFormComplete: affiliatesTable.taxFormComplete,
        ftcDisclosureAccepted: affiliatesTable.ftcDisclosureAccepted,
        gdprConsent: affiliatesTable.gdprConsent,
        withholdTax: affiliatesTable.withholdTax,
        withholdTaxRatePct: affiliatesTable.withholdTaxRatePct,
        country: affiliatesTable.country,
        dac7Reportable: affiliatesTable.dac7Reportable,
        totalPaidYtdCents: affiliatesTable.totalPaidYtdCents,
      })
      .from(commissionLedgerTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, commissionLedgerTable.affiliateUserId),
      )
      .where(
        and(
          eq(commissionLedgerTable.payoutBatchId, id),
          eq(commissionLedgerTable.status, "approved"),
        ),
      );

    // Group by affiliate user ID
    const byAffiliate = new Map<
      number,
      {
        stripeConnectAccountId: string | null;
        connectOnboardingComplete: boolean;
        taxFormComplete: boolean;
        ftcDisclosureAccepted: boolean;
        gdprConsent: boolean;
        withholdTax: boolean;
        withholdTaxRatePct: number;
        country: string | null;
        dac7Reportable: boolean;
        totalPaidYtdCents: number;
        ledgerIds: number[];
        totalCents: number;
      }
    >();

    for (const e of entries) {
      const cur = byAffiliate.get(e.affiliateUserId) ?? {
        stripeConnectAccountId: e.stripeConnectAccountId,
        connectOnboardingComplete: e.connectOnboardingComplete,
        taxFormComplete: e.taxFormComplete,
        ftcDisclosureAccepted: e.ftcDisclosureAccepted,
        gdprConsent: e.gdprConsent,
        withholdTax: e.withholdTax,
        withholdTaxRatePct: e.withholdTaxRatePct,
        country: e.country,
        dac7Reportable: e.dac7Reportable,
        totalPaidYtdCents: e.totalPaidYtdCents,
        ledgerIds: [],
        totalCents: 0,
      };
      cur.ledgerIds.push(e.ledgerId);
      cur.totalCents += e.amountCents;
      byAffiliate.set(e.affiliateUserId, cur);
    }

    const results: {
      affiliateUserId: number;
      status:
        | "transferred"
        | "skipped_no_connect"
        | "skipped_incomplete"
        | "skipped_compliance"
        | "failed";
      transferId?: string;
      grossCents?: number;
      withheldCents?: number;
      netCents?: number;
      error?: string;
    }[] = [];

    const now = new Date();
    // $600 threshold for 1099-NEC requirement (in cents)
    const THRESHOLD_1099_CENTS = 60_000;

    for (const [affiliateUserId, group] of byAffiliate) {
      const country = (group.country ?? "US").toUpperCase();

      // Compliance gate: tax form + FTC disclosure must both be complete.
      // EU/UK affiliates additionally require GDPR consent.
      const needsGdpr = isEuMemberState(country) || country === "GB";
      const complianceOk =
        group.taxFormComplete &&
        group.ftcDisclosureAccepted &&
        (!needsGdpr || group.gdprConsent);

      if (!complianceOk) {
        results.push({ affiliateUserId, status: "skipped_compliance" });
        continue;
      }
      if (!group.stripeConnectAccountId) {
        results.push({ affiliateUserId, status: "skipped_no_connect" });
        continue;
      }
      if (!group.connectOnboardingComplete) {
        results.push({ affiliateUserId, status: "skipped_incomplete" });
        continue;
      }

      // Apply withholding (AU without ABN → 47%; all others → 0%)
      const withheldCents = group.withholdTax
        ? Math.floor(group.totalCents * (group.withholdTaxRatePct / 100))
        : 0;
      const netCents = group.totalCents - withheldCents;

      try {
        const transfer = await stripe.transfers.create({
          amount: netCents,
          currency: "usd",
          destination: group.stripeConnectAccountId,
          metadata: {
            batchId: String(id),
            affiliateUserId: String(affiliateUserId),
            periodMonth: batch.periodMonth,
            grossCents: String(group.totalCents),
            withheldCents: String(withheldCents),
            withholdingRatePct: String(group.withholdTaxRatePct),
          },
        });

        const newYtd = group.totalPaidYtdCents + group.totalCents;
        const eurEquivCents = usdCentsToEurCents(group.totalCents);

        await db
          .update(commissionLedgerTable)
          .set({ status: "paid", stripeTransferId: transfer.id, paidAt: now })
          .where(inArray(commissionLedgerTable.id, group.ledgerIds));

        // Track YTD, 1099 threshold, and DAC7 EUR-equivalent earnings
        await db
          .update(affiliatesTable)
          .set({
            totalPaidYtdCents: sql`total_paid_ytd_cents + ${group.totalCents}`,
            requires1099: newYtd >= THRESHOLD_1099_CENTS,
            ...(group.dac7Reportable && {
              totalEarnedEurEquivCents: sql`total_earned_eur_equiv_cents + ${eurEquivCents}`,
            }),
          })
          .where(eq(affiliatesTable.userId, affiliateUserId));

        results.push({
          affiliateUserId,
          status: "transferred",
          transferId: transfer.id,
          grossCents: group.totalCents,
          withheldCents,
          netCents,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, affiliateUserId, batchId: id }, "stripe transfer failed");
        results.push({ affiliateUserId, status: "failed", error: message });
      }
    }

    // Mark batch completed if all entries are now paid
    const remainingApproved = await db.query.commissionLedgerTable.findFirst({
      where: and(
        eq(commissionLedgerTable.payoutBatchId, id),
        eq(commissionLedgerTable.status, "approved"),
      ),
    });

    let updatedBatch = batch;
    if (!remainingApproved) {
      const [b] = await db
        .update(payoutBatchesTable)
        .set({ status: "completed", completedAt: now })
        .where(eq(payoutBatchesTable.id, id))
        .returning();
      updatedBatch = b;
    }

    logger.info({ batchId: id, results }, "payout batch processed");
    res.json({ batch: updatedBatch, results });
  } catch (err) {
    logger.error({ err }, "admin/payouts process error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/admin/payouts/:id/complete
 *
 * Manually marks any remaining approved entries as paid and closes the batch.
 * Use this after handling non-Connect affiliates out-of-band (bank transfer, etc).
 */
router.post("/admin/payouts/:id/complete", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (batch.status !== "approved") {
      res.status(409).json({ error: "batch_must_be_approved_first", status: batch.status });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(payoutBatchesTable)
      .set({ status: "completed", completedAt: now })
      .where(eq(payoutBatchesTable.id, id))
      .returning();

    await db
      .update(commissionLedgerTable)
      .set({ status: "paid", paidAt: now })
      .where(
        and(
          eq(commissionLedgerTable.payoutBatchId, id),
          eq(commissionLedgerTable.status, "approved"),
        ),
      );

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/payouts complete error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Rates ──────────────────────────────────────────────────────────────────────

router.get("/admin/rates", async (req, res) => {
  try {
    const phases = await db
      .select()
      .from(commissionPhasesTable)
      .orderBy(commissionPhasesTable.phaseNumber, commissionPhasesTable.tier);
    res.json(phases);
  } catch (err) {
    logger.error({ err }, "admin/rates list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/admin/rates/current", async (req, res) => {
  try {
    const rates = await getCurrentRates();
    res.json(rates);
  } catch (err) {
    logger.error({ err }, "admin/rates current error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/rates/phase", async (req, res) => {
  const {
    phaseName,
    phaseNumber,
    tier,
    planType,
    amountCents,
    triggerType = "manual",
    triggerValue,
    scheduledFor,
    notes,
  } = req.body as {
    phaseName: string;
    phaseNumber: number;
    tier: string;
    planType: string;
    amountCents: number;
    triggerType?: string;
    triggerValue?: number;
    scheduledFor?: string;
    notes?: string;
  };

  if (!phaseName || !tier || !planType || !amountCents || !phaseNumber) {
    res
      .status(400)
      .json({ error: "phaseName, phaseNumber, tier, planType, amountCents required" });
    return;
  }

  const validTiers = ["standard", "silver", "gold", "platinum"];
  const validPlans = ["monthly", "annual", "lifetime"];
  const validTriggers = ["manual", "date", "subscriber_count", "gross_revenue"];

  if (!validTiers.includes(tier) || !validPlans.includes(planType)) {
    res.status(400).json({ error: "invalid tier or planType" });
    return;
  }
  if (!validTriggers.includes(triggerType)) {
    res.status(400).json({ error: "invalid triggerType" });
    return;
  }

  try {
    const [phase] = await db
      .insert(commissionPhasesTable)
      .values({
        phaseName,
        phaseNumber,
        tier,
        planType,
        amountCents,
        triggerType,
        triggerValue: triggerValue ?? null,
        scheduledFor: scheduledFor ?? null,
        notes,
        isActive: false,
      })
      .returning();

    res.status(201).json(phase);
  } catch (err) {
    logger.error({ err }, "admin/rates phase error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/rates/check-triggers", async (req, res) => {
  /**
   * Check all inactive phases and activate any whose trigger condition has been met.
   * Provide current totals for subscriber_count and gross_revenue checks.
   *
   * Body (optional):
   *   activePaidSubscribers  — current active paid subscriber count
   *   grossRevenueCents      — cumulative gross revenue in cents
   */
  const { activePaidSubscribers = 0, grossRevenueCents = 0 } = req.body as {
    activePaidSubscribers?: number;
    grossRevenueCents?: number;
  };

  try {
    const inactivePhases = await db
      .select()
      .from(commissionPhasesTable)
      .where(eq(commissionPhasesTable.isActive, false));

    const now = new Date();
    const today = now.toISOString().split("T")[0]!;
    const activated: typeof inactivePhases = [];

    for (const phase of inactivePhases) {
      let shouldActivate = false;

      if (phase.triggerType === "date" && phase.scheduledFor) {
        shouldActivate = phase.scheduledFor <= today;
      } else if (
        phase.triggerType === "subscriber_count" &&
        phase.triggerValue !== null
      ) {
        shouldActivate = activePaidSubscribers >= phase.triggerValue;
      } else if (
        phase.triggerType === "gross_revenue" &&
        phase.triggerValue !== null
      ) {
        shouldActivate = grossRevenueCents >= phase.triggerValue;
      }
      // manual — never auto-activates here

      if (shouldActivate) {
        await db
          .update(commissionPhasesTable)
          .set({ isActive: true, activatedAt: now })
          .where(eq(commissionPhasesTable.id, phase.id));
        activated.push({ ...phase, isActive: true, activatedAt: now });
      }
    }

    res.json({
      checked: inactivePhases.length,
      activated: activated.length,
      activatedPhases: activated,
    });
  } catch (err) {
    logger.error({ err }, "admin/rates check-triggers error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/rates/:id/activate", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [updated] = await db
      .update(commissionPhasesTable)
      .set({ isActive: true, activatedAt: new Date() })
      .where(eq(commissionPhasesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/rates activate error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
