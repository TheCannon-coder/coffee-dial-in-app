/**
 * Shared affiliate commission helpers used by both admin routes and the
 * Stripe webhook handler. Extracted here to avoid duplicating logic.
 */

import { eq, desc } from "drizzle-orm";
import { db, affiliatesTable, commissionLedgerTable, commissionPhasesTable, referralConversionsTable } from "@workspace/db";

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  return globalRates[affiliate.tier]?.[planType] ?? 75;
}

export async function ensureRatesLocked(
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
    .set({ customMonthlyRateCents: monthly, customAnnualRateCents: annual, customLifetimeRateCents: lifetime })
    .where(eq(affiliatesTable.id, affiliate.id))
    .returning();

  return updated!;
}

/**
 * Called when a referred user subscribes. Marks the conversion active,
 * locks the affiliate's rate, and generates a one-time commission for
 * annual/lifetime plans. Safe to call multiple times (idempotent on
 * already-subscribed conversions).
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

  const affiliate = await db.query.affiliatesTable.findFirst({
    where: eq(affiliatesTable.userId, conversion.referrerUserId),
  });
  if (!affiliate) return;

  const now = new Date();
  const payableAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const periodMonth = currentMonth();

  await db
    .update(referralConversionsTable)
    .set({
      planType,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      isSubscriptionActive: true,
      subscribedAt: now,
      payableAfter,
    })
    .where(eq(referralConversionsTable.id, conversion.id));

  const rates = await getCurrentRates();
  const lockedAffiliate = await ensureRatesLocked(affiliate, rates);

  if (planType === "annual" || planType === "lifetime") {
    const amountCents = resolveRateCents(lockedAffiliate, planType, rates);
    if (amountCents > 0) {
      await db.insert(commissionLedgerTable).values({
        affiliateUserId: affiliate.userId,
        conversionId: conversion.id,
        periodMonth,
        planType,
        commissionType: "one_time",
        amountCents,
        tier: affiliate.tier,
        status: "pending",
      });
    }
  }
}
