/**
 * Shared affiliate commission helpers used by both admin routes and the
 * Stripe webhook handler. Extracted here to avoid duplicating logic.
 */

import { eq, desc, and, gte, isNull, count, sql } from "drizzle-orm";

/**
 * Thrown when a commission rate lookup finds no active commission_phases row
 * for a given (tier, planType) combination and the affiliate has no custom
 * rate override for that planType. This is a configuration gap — it must be
 * surfaced loudly rather than silently producing a $0 payout entry.
 */
export class MissingCommissionRateError extends Error {
  constructor(
    public readonly tier: string,
    public readonly planType: string,
  ) {
    super(`No active commission rate for tier="${tier}" planType="${planType}" — check commission_phases table`);
    this.name = "MissingCommissionRateError";
  }
}

import {
  db,
  affiliatesTable,
  commissionLedgerTable,
  commissionPhasesTable,
  referralConversionsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "./logger";

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Volume-based tier automation ─────────────────────────────────────────────

/**
 * Tier ladder based on how many of an affiliate's referred conversions are
 * currently active, paying subscribers. Ordered highest-first so
 * resolveTierForCount can return on the first match.
 *
 *   Standard: 0-9 active referred subscribers
 *   Silver:   10-99
 *   Gold:     100-999
 *   Platinum: 1,000+
 */
const TIER_THRESHOLDS: { tier: string; min: number }[] = [
  { tier: "platinum", min: 1000 },
  { tier: "gold", min: 100 },
  { tier: "silver", min: 10 },
  { tier: "standard", min: 0 },
];

/** Rank used to enforce "tiers only ever move up" — never demote an affiliate. */
export const TIER_RANK: Record<string, number> = {
  standard: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

export function resolveTierForCount(activeReferredSubscriberCount: number): string {
  const match = TIER_THRESHOLDS.find((t) => activeReferredSubscriberCount >= t.min);
  return match?.tier ?? "standard";
}

/** Counts this affiliate's referred conversions that are currently active, paying subscriptions. */
export async function countActiveReferredSubscribers(affiliateUserId: number): Promise<number> {
  const [row] = await db
    .select({ cnt: count() })
    .from(referralConversionsTable)
    .where(
      and(
        eq(referralConversionsTable.referrerUserId, affiliateUserId),
        eq(referralConversionsTable.isAffiliateConversion, true),
        eq(referralConversionsTable.isSubscriptionActive, true),
      ),
    );
  return Number(row?.cnt ?? 0);
}

/**
 * Best-effort congratulations email for affiliates who just crossed into
 * Platinum. Gated behind RESEND_API_KEY like every other not-yet-configured
 * integration in this app — logs and no-ops if the key isn't set, rather
 * than failing the promotion.
 */
async function sendPlatinumCongratulationsEmail(affiliate: {
  id: number;
  userId: number;
  payoutEmail: string;
  name: string | null;
}): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    logger.warn(
      { affiliateId: affiliate.id },
      "Platinum reached but RESEND_API_KEY not set — congratulations email not sent",
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dial In <hello@coffeebrew.coach>",
        to: affiliate.payoutEmail,
        subject: "You've reached Platinum status 🎉",
        html: `<p>Hi ${affiliate.name ?? "there"},</p><p>You've just crossed 1,000 active referred subscribers and unlocked our Platinum tier — our highest commission rate. Thank you for driving so much growth for Dial In.</p><p>Someone from our founding team will be reaching out personally soon.</p>`,
      }),
    });
    if (!response.ok) {
      logger.error(
        { affiliateId: affiliate.id, status: response.status },
        "Platinum congratulations email failed to send",
      );
    }
  } catch (err) {
    logger.error({ err, affiliateId: affiliate.id }, "Platinum congratulations email threw");
  }
}

/**
 * Recomputes an affiliate's tier from their active referred subscriber count
 * and promotes them if they've crossed into a higher tier. Tiers are sticky —
 * this never demotes, even if active count later drops (e.g. cancellations).
 *
 * On promotion, the affiliate's locked commission rate is refreshed to the
 * new tier's current rate, so the step-up takes effect immediately and going
 * forward (consistent with the existing "lock rate at first conversion"
 * protection against future phase step-downs — a promotion just re-locks at
 * the new, higher tier).
 *
 * On first crossing into Platinum: stamps platinum_achieved_at, flags
 * founder_outreach_pending, and fires a best-effort congratulations email.
 *
 * @param extraActiveCount - active subscribers not yet committed to the DB
 *   (e.g. the conversion currently being marked subscribed), so the count
 *   used for promotion reflects the event that triggered this check.
 */
export async function promoteAffiliateTierIfEligible(
  affiliateUserId: number,
  extraActiveCount = 0,
): Promise<{ promoted: boolean; newTier?: string; reachedPlatinum?: boolean }> {
  const affiliate = await db.query.affiliatesTable.findFirst({
    where: eq(affiliatesTable.userId, affiliateUserId),
  });
  if (!affiliate) return { promoted: false };

  const activeCount = (await countActiveReferredSubscribers(affiliateUserId)) + extraActiveCount;
  const targetTier = resolveTierForCount(activeCount);

  if (TIER_RANK[targetTier]! <= TIER_RANK[affiliate.tier]!) {
    return { promoted: false };
  }

  const rates = await getCurrentRates();
  const tierRates = rates[targetTier];
  const reachedPlatinum = targetTier === "platinum";
  const now = new Date();

  const missingOnPromotion = (["monthly", "annual", "lifetime"] as const).filter(
    (pt) => tierRates?.[pt] === undefined,
  );
  if (missingOnPromotion.length > 0) {
    logger.error(
      { affiliateUserId, targetTier, missingPlanTypes: missingOnPromotion },
      "ADMIN ALERT: Affiliate promoted to new tier but commission_phases has no active rate row for one or more plan types — custom rates NOT locked; payout entries for this affiliate will fail until rates are configured",
    );
  }

  await db
    .update(affiliatesTable)
    .set({
      tier: targetTier,
      ...(missingOnPromotion.length === 0
        ? {
            customMonthlyRateCents: tierRates!["monthly"]!,
            customAnnualRateCents: tierRates!["annual"]!,
            customLifetimeRateCents: tierRates!["lifetime"]!,
          }
        : {}),
      ...(reachedPlatinum
        ? { platinumAchievedAt: now, founderOutreachPending: true }
        : {}),
    })
    .where(eq(affiliatesTable.id, affiliate.id));

  logger.info(
    { affiliateUserId, fromTier: affiliate.tier, toTier: targetTier, activeCount },
    "Affiliate tier auto-promoted",
  );

  if (reachedPlatinum) {
    await sendPlatinumCongratulationsEmail(affiliate);
  }

  return { promoted: true, newTier: targetTier, reachedPlatinum };
}

/**
 * Read-only pre-flight check — throws MissingCommissionRateError if no rate
 * will be available for the affiliate's would-be tier (after any pending
 * promotion) for the given planType.
 *
 * Call this BEFORE any DB writes so that a missing-rate config error leaves
 * no partial state (no tier changes, no platinum flags, no conversion rows).
 *
 * @param extraActiveCount subscribers not yet committed to the DB (e.g. 1
 *   when about to mark a new subscription active), so the promotion check
 *   reflects the event that triggered this call.
 */
export async function assertRateWillExistForConversion(
  affiliate: AffiliateWithRates & { userId: number },
  planType: string,
  globalRates: Record<string, Record<string, number>>,
  extraActiveCount = 0,
): Promise<void> {
  // If this affiliate already has a custom rate locked for this planType,
  // resolveRateCents will use it — no global row needed.
  const customMap: Record<string, number | null | undefined> = {
    monthly: affiliate.customMonthlyRateCents,
    annual: affiliate.customAnnualRateCents,
    lifetime: affiliate.customLifetimeRateCents,
  };
  if (customMap[planType] !== null && customMap[planType] !== undefined) return;

  // Compute the would-be effective tier after promotion (read-only — no DB writes).
  const activeCount = (await countActiveReferredSubscribers(affiliate.userId)) + extraActiveCount;
  const wouldBeTier = resolveTierForCount(activeCount);
  const effectiveTier =
    TIER_RANK[wouldBeTier]! > TIER_RANK[affiliate.tier]! ? wouldBeTier : affiliate.tier;

  if (globalRates[effectiveTier]?.[planType] === undefined) {
    throw new MissingCommissionRateError(effectiveTier, planType);
  }
}

export async function getCurrentRates(): Promise<Record<string, Record<string, number>>> {
  const phases = await db
    .select()
    .from(commissionPhasesTable)
    .where(eq(commissionPhasesTable.isActive, true))
    .orderBy(desc(commissionPhasesTable.phaseNumber));

  const rates: Record<string, Record<string, number>> = {};
  for (const p of phases) {
    if (!rates[p.tier]) rates[p.tier] = {};
    if (!rates[p.tier]![p.planType]) {
      rates[p.tier]![p.planType] = p.amountCents;
    }
  }
  return rates;
}

export type AffiliateWithRates = {
  id: number;
  tier: string;
  customMonthlyRateCents: number | null;
  customAnnualRateCents: number | null;
  customLifetimeRateCents: number | null;
};

export function resolveRateCents(
  affiliate: AffiliateWithRates,
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

  const globalRate = globalRates[affiliate.tier]?.[planType];
  if (globalRate === undefined) {
    throw new MissingCommissionRateError(affiliate.tier, planType);
  }
  return globalRate;
}

/**
 * Locks commission rates for an affiliate if they aren't already set.
 *
 * @param requiredPlanTypes - Only these plan types must have an active rate
 *   row; missing required plan types throw MissingCommissionRateError.
 *   Defaults to all three ("monthly", "annual", "lifetime") when omitted.
 *   Pass the specific plan type(s) relevant to the current operation to avoid
 *   blocking valid payouts because of unrelated missing rate rows (e.g. the
 *   monthly payout batch only requires "monthly").
 *
 *   Non-required plan types are locked to null if missing — they can be
 *   configured and re-locked later; downstream resolveRateCents will throw if
 *   they are ever needed without a rate configured.
 */
export async function ensureRatesLocked(
  affiliate: AffiliateWithRates,
  globalRates: Record<string, Record<string, number>>,
  options: { requiredPlanTypes?: readonly string[] } = {},
): Promise<AffiliateWithRates> {
  const alreadyLocked =
    affiliate.customMonthlyRateCents !== null ||
    affiliate.customAnnualRateCents !== null ||
    affiliate.customLifetimeRateCents !== null;

  if (alreadyLocked) return affiliate;

  const tierRates = globalRates[affiliate.tier];
  const required = options.requiredPlanTypes ?? (["monthly", "annual", "lifetime"] as const);

  const missingRequired = required.filter((pt) => tierRates?.[pt] === undefined);
  if (missingRequired.length > 0) {
    throw new MissingCommissionRateError(affiliate.tier, missingRequired.join(", "));
  }

  const monthly = tierRates?.["monthly"] ?? null;
  const annual = tierRates?.["annual"] ?? null;
  const lifetime = tierRates?.["lifetime"] ?? null;

  const [updated] = await db
    .update(affiliatesTable)
    .set({ customMonthlyRateCents: monthly, customAnnualRateCents: annual, customLifetimeRateCents: lifetime })
    .where(eq(affiliatesTable.id, affiliate.id))
    .returning();

  return updated!;
}

// ── RevenueCat entitlement grant ─────────────────────────────────────────────

/**
 * Grant a promotional Pro entitlement via RevenueCat v2 SDK.
 * months: number of calendar months to grant (1, 2, 3, 6, or 12).
 * Returns true on success.
 */
export async function grantRcProEntitlement(rcId: string, months: number): Promise<boolean> {
  const { grantProEntitlement } = await import("./revenuecat.js");
  return grantProEntitlement(rcId, months);
}

// ── Friend referral brew tracking ────────────────────────────────────────────

/**
 * Called after every brew session (non-blocking, fire-and-forget).
 * Increments brew_count on the referred user's conversion record.
 * When brew_count reaches 3 and the referrer hasn't been rewarded yet:
 *   - Grants the referrer 1 month of Pro via RevenueCat
 *   - Checks if the referrer now has 10+ qualifying referrals → pro_permanent
 */
export async function recordBrewForReferral(referredUserId: number): Promise<void> {
  const conversion = await db.query.referralConversionsTable.findFirst({
    where: and(
      eq(referralConversionsTable.referredUserId, referredUserId),
      eq(referralConversionsTable.isAffiliateConversion, false),
      isNull(referralConversionsTable.referrerRewardedAt),
    ),
  });

  if (!conversion) return;

  const newCount = (conversion.brewCount ?? 0) + 1;

  await db
    .update(referralConversionsTable)
    .set({ brewCount: newCount })
    .where(eq(referralConversionsTable.id, conversion.id));

  if (newCount < 3) return;

  const referrer = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, conversion.referrerUserId),
  });
  if (!referrer) return;

  const rcId = referrer.anonId;
  if (!rcId) return;

  const granted = await grantRcProEntitlement(rcId, 1);
  if (!granted) {
    logger.warn({ referrerId: referrer.id }, "recordBrewForReferral: RC grant failed, will retry next brew");
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(referralConversionsTable)
      .set({ referrerRewardedAt: new Date() })
      .where(eq(referralConversionsTable.id, conversion.id));
    await tx
      .update(usersTable)
      .set({ isPro: true })
      .where(eq(usersTable.id, referrer.id));
  });

  logger.info({ referrerId: referrer.id, conversionId: conversion.id }, "Friend referral: 30-day Pro granted to referrer");

  await checkAndGrantPermanentPro(referrer.id);
}

/**
 * Counts how many of the referrer's friend-track conversions have hit 3+ brews
 * (i.e. "qualifying referrals"). If >= 10, sets pro_permanent on the user.
 */
export async function checkAndGrantPermanentPro(referrerUserId: number): Promise<boolean> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, referrerUserId),
  });
  if (!user || user.proPermanent) return false;

  const [row] = await db
    .select({ cnt: count() })
    .from(referralConversionsTable)
    .where(
      and(
        eq(referralConversionsTable.referrerUserId, referrerUserId),
        eq(referralConversionsTable.isAffiliateConversion, false),
        gte(referralConversionsTable.brewCount, 3),
      ),
    );

  const qualifyingCount = Number(row?.cnt ?? 0);
  if (qualifyingCount < 10) return false;

  await db
    .update(usersTable)
    .set({ proPermanent: true, isPro: true })
    .where(eq(usersTable.id, referrerUserId));

  logger.info({ referrerUserId, qualifyingCount }, "Friend referral: permanent Pro granted");
  return true;
}

// ── Conversion subscription recording ───────────────────────────────────────

/**
 * Called when a referred user subscribes (Stripe webhook checkout.session.completed).
 * Determines the reward track (affiliate vs friend) and sets up commission or brew tracking.
 *
 * Affiliate track (referrer is in affiliates table):
 *   - Locks the affiliate's commission rate
 *   - For monthly plans: marks as active; monthly payout job handles recurring commissions
 *   - For annual plans: sets up 12 monthly instalments
 *   - For lifetime plans: sets up 6 monthly instalments
 *
 * Friend track (referrer is not an affiliate):
 *   - Sets isAffiliateConversion=false
 *   - brew_count tracking (via recordBrewForReferral) will trigger the 30-day Pro reward
 *
 * Safe to call multiple times (idempotent on already-subscribed conversions).
 */
export async function recordConversionSubscribed(
  conversionId: number,
  planType: "monthly" | "annual" | "lifetime",
  stripeSubscriptionId: string | null,
): Promise<void> {
  const conversion = await db.query.referralConversionsTable.findFirst({
    where: eq(referralConversionsTable.id, conversionId),
  });
  if (!conversion || conversion.isSubscriptionActive) return;

  const now = new Date();
  const payableAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const periodMonth = currentMonth();

  const affiliate = await db.query.affiliatesTable.findFirst({
    where: and(
      eq(affiliatesTable.userId, conversion.referrerUserId),
      eq(affiliatesTable.isActive, true),
    ),
  });

  const isAffiliateConversion = !!affiliate;

  if (isAffiliateConversion && affiliate) {
    // ── Affiliate track ──────────────────────────────────────────────────────

    // Pre-flight: validate rates before any DB write (tier promotion, conversion
    // update, ledger insert). If the rate config is missing this throws
    // MissingCommissionRateError — which bubbles to the Stripe webhook handler
    // so the event is retried once the rate is configured, leaving no partial state.
    const rates = await getCurrentRates();
    await assertRateWillExistForConversion(affiliate, planType, rates, 1);

    // Rate config confirmed — recompute tier (extraActiveCount=1 since this
    // conversion isn't marked active in the DB yet) then lock rates.
    const promotion = await promoteAffiliateTierIfEligible(affiliate.userId, 1);
    const affiliateForRate = promotion.promoted
      ? (await db.query.affiliatesTable.findFirst({ where: eq(affiliatesTable.id, affiliate.id) }))!
      : await ensureRatesLocked(affiliate, rates, { requiredPlanTypes: [planType] });
    const rateCents = resolveRateCents(affiliateForRate, planType, rates);

    let instalmentTotal: number | null = null;
    let instalmentMonthlyAmountCents: number | null = null;
    let instalmentStatus = "na";
    let nextPayoutDateStr: string | null = null;

    if (planType === "annual") {
      instalmentTotal = 12;
      instalmentMonthlyAmountCents = rateCents > 0 ? Math.round(rateCents / 12) : 0;
      instalmentStatus = "active";
      const d = new Date(payableAfter);
      nextPayoutDateStr = d.toISOString().slice(0, 10);
    } else if (planType === "lifetime") {
      instalmentTotal = 6;
      instalmentMonthlyAmountCents = rateCents > 0 ? Math.round(rateCents / 6) : 0;
      instalmentStatus = "active";
      const d = new Date(payableAfter);
      nextPayoutDateStr = d.toISOString().slice(0, 10);
    }

    await db
      .update(referralConversionsTable)
      .set({
        planType,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        isSubscriptionActive: true,
        subscribedAt: now,
        payableAfter,
        isAffiliateConversion: true,
        instalmentTotal,
        instalmentMonthlyAmountCents,
        instalmentStatus,
        nextPayoutDate: nextPayoutDateStr,
      })
      .where(eq(referralConversionsTable.id, conversion.id));

    if (planType === "monthly" && rateCents > 0) {
      await db.insert(commissionLedgerTable).values({
        affiliateUserId: affiliate.userId,
        conversionId: conversion.id,
        periodMonth,
        planType,
        commissionType: "recurring",
        amountCents: rateCents,
        tier: affiliate.tier,
        status: "pending",
      });
    }

    logger.info({ conversionId, planType, isAffiliateConversion, instalmentTotal }, "Conversion recorded — affiliate track");
  } else {
    // ── Friend track ─────────────────────────────────────────────────────────
    await db
      .update(referralConversionsTable)
      .set({
        planType,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        isSubscriptionActive: true,
        subscribedAt: now,
        payableAfter,
        isAffiliateConversion: false,
      })
      .where(eq(referralConversionsTable.id, conversion.id));

    logger.info({ conversionId, planType }, "Conversion recorded — friend track (brew counting active)");
  }
}

/**
 * Monthly payout job helper — process one instalment for an active annual/lifetime conversion.
 * Call this for each conversion where instalmentStatus='active' and nextPayoutDate <= today.
 * Returns true if an instalment was released, false if nothing to do.
 */
export async function processNextInstalment(conversionId: number): Promise<boolean> {
  const conversion = await db.query.referralConversionsTable.findFirst({
    where: eq(referralConversionsTable.id, conversionId),
  });

  if (
    !conversion ||
    conversion.instalmentStatus !== "active" ||
    !conversion.instalmentTotal ||
    !conversion.instalmentMonthlyAmountCents
  ) return false;

  if (conversion.nextPayoutDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (conversion.nextPayoutDate > today) return false;
  }

  if (conversion.instalmentsPaid >= conversion.instalmentTotal) {
    await db
      .update(referralConversionsTable)
      .set({ instalmentStatus: "complete" })
      .where(eq(referralConversionsTable.id, conversionId));
    return false;
  }

  const affiliate = await db.query.affiliatesTable.findFirst({
    where: eq(affiliatesTable.userId, conversion.referrerUserId),
  });
  if (!affiliate) return false;

  const periodMonth = currentMonth();
  const newPaid = conversion.instalmentsPaid + 1;
  const isLast = newPaid >= (conversion.instalmentTotal ?? 0);

  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + 1);
  const nextPayoutDateStr = nextDate.toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    await tx.insert(commissionLedgerTable).values({
      affiliateUserId: affiliate.userId,
      conversionId: conversion.id,
      periodMonth,
      planType: conversion.planType ?? "annual",
      commissionType: "instalment",
      amountCents: conversion.instalmentMonthlyAmountCents!,
      tier: affiliate.tier,
      status: "pending",
    });

    await tx
      .update(referralConversionsTable)
      .set({
        instalmentsPaid: newPaid,
        instalmentStatus: isLast ? "complete" : "active",
        nextPayoutDate: isLast ? null : nextPayoutDateStr,
      })
      .where(eq(referralConversionsTable.id, conversionId));
  });

  logger.info(
    { conversionId, instalmentsPaid: newPaid, total: conversion.instalmentTotal, isLast },
    "Instalment released",
  );
  return true;
}
