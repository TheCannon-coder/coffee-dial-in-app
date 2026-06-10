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
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  affiliatesTable,
  referralConversionsTable,
  commissionLedgerTable,
  payoutBatchesTable,
  commissionPhasesTable,
} from "@workspace/db";
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

    await db
      .update(referralConversionsTable)
      .set({
        planType,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        isSubscriptionActive: true,
        subscribedAt: now,
      })
      .where(eq(referralConversionsTable.id, id));

    // For annual and lifetime: generate a one-time commission immediately
    let ledgerEntry = null;
    if (planType === "annual" || planType === "lifetime") {
      const rates = await getCurrentRates();
      const amountCents = resolveRateCents(affiliate, planType, rates);

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
  const { periodMonth = currentMonth(), notes } = req.body as {
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
      await db.insert(commissionLedgerTable).values(
        newEntries.map((c) => ({
          affiliateUserId: c.referrerUserId,
          conversionId: c.conversionId,
          periodMonth,
          planType: "monthly",
          commissionType: "recurring",
          amountCents: resolveRateCents(c, "monthly", rates),
          tier: c.tier,
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
    let batch;
    if (existing) {
      const [updated] = await db
        .update(payoutBatchesTable)
        .set({
          totalAmountCents,
          affiliateCount: uniqueAffiliates.size,
          notes: notes ?? existing.notes,
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
