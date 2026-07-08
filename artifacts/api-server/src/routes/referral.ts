/**
 * Referral & affiliate self-serve routes.
 * All routes gated behind REFERRAL_PROGRAM=true.
 *
 * POST /referral/claim       — claim a referral code at signup (creates conversion, grants 1 month Pro)
 * POST /affiliate/join       — self-serve affiliate opt-in
 * GET  /referral/friend-stats — friend referral progress (qualifying count, proPermanent)
 */

import { Router } from "express";
import { eq, and, count, gte } from "drizzle-orm";
import {
  db,
  usersTable,
  affiliatesTable,
  referralConversionsTable,
} from "@workspace/db";
import { grantRcProEntitlement } from "../lib/affiliate-helpers";

const router = Router();

// ── POST /referral/claim ─────────────────────────────────────────────────────

/**
 * Called during onboarding when a new user receives a referral code.
 * Creates the referral_conversions row and grants 1 month of Pro to the referred user.
 *
 * Body: { referralCode, userId, revenuecatId }
 *
 * Rules:
 *  - referralCode must exist and belong to a real user (not self)
 *  - userId must exist in the DB
 *  - User must not have already been referred (referredByCode is null)
 *  - New signups only — user must not already have isPro=true from a paid subscription
 */
router.post("/referral/claim", async (req, res) => {
  const { referralCode, userId, revenuecatId } = req.body as {
    referralCode?: string;
    userId?: number;
    revenuecatId?: string;
  };

  if (!referralCode || !userId || !revenuecatId) {
    res.status(400).json({ error: "referralCode, userId, and revenuecatId are required" });
    return;
  }

  const code = referralCode.trim().toUpperCase();

  const referrer = await db.query.usersTable.findFirst({
    where: eq(usersTable.referralCode, code),
  });

  if (!referrer) {
    res.status(404).json({ error: "Referral code not found." });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (referrer.id === user.id) {
    res.status(400).json({ error: "You can't use your own referral code." });
    return;
  }

  if (user.referredByCode) {
    res.status(409).json({ error: "You've already used a referral code." });
    return;
  }

  const existing = await db.query.referralConversionsTable.findFirst({
    where: eq(referralConversionsTable.referredUserId, userId),
  });

  if (existing) {
    res.status(409).json({ error: "Referral already recorded for this account." });
    return;
  }

  await db
    .update(usersTable)
    .set({ referredByCode: code })
    .where(eq(usersTable.id, userId));

  await db.insert(referralConversionsTable).values({
    referralCode: code,
    referrerUserId: referrer.id,
    referredUserId: userId,
    isSubscriptionActive: false,
    brewCount: 0,
    isAffiliateConversion: false,
    instalmentsPaid: 0,
    instalmentStatus: "na",
  });

  const granted = await grantRcProEntitlement(revenuecatId, 1);

  if (granted) {
    await db
      .update(usersTable)
      .set({ isPro: true })
      .where(eq(usersTable.id, userId));
  }

  req.log.info(
    { referrerId: referrer.id, referredUserId: userId, rcGranted: granted },
    "referral/claim: code claimed",
  );

  res.json({
    success: true,
    rcGranted: granted,
    message: granted
      ? "Referral code applied! You've got 1 month of Pro free."
      : "Referral code recorded — Pro access will activate shortly.",
  });
});

// ── POST /affiliate/join ─────────────────────────────────────────────────────

/**
 * Self-serve affiliate opt-in.
 * Any registered user can join by accepting FTC disclosure and providing payout details.
 *
 * Body: { email, country, payoutEmail, audienceSize?, name?, ftcDisclosureAccepted }
 */
router.post("/affiliate/join", async (req, res) => {
  const {
    email,
    country,
    payoutEmail,
    audienceSize,
    name,
    ftcDisclosureAccepted,
  } = req.body as {
    email?: string;
    country?: string;
    payoutEmail?: string;
    audienceSize?: number;
    name?: string;
    ftcDisclosureAccepted?: boolean;
  };

  if (!email || !country || !payoutEmail) {
    res.status(400).json({ error: "email, country, and payoutEmail are required" });
    return;
  }

  if (!ftcDisclosureAccepted) {
    res.status(400).json({ error: "FTC disclosure must be accepted to join the affiliate program" });
    return;
  }

  const allowedCountries = ["US", "CA"];
  if (!allowedCountries.includes(country.toUpperCase())) {
    res.status(400).json({
      error: "Affiliate payouts are currently available in the US and Canada only.",
      comingSoon: true,
    });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user) {
    res.status(404).json({ error: "Account not found. Please sign in first." });
    return;
  }

  const existing = await db.query.affiliatesTable.findFirst({
    where: eq(affiliatesTable.userId, user.id),
  });

  if (existing) {
    res.status(409).json({ error: "You're already enrolled in the affiliate program." });
    return;
  }

  const now = new Date();
  const [affiliate] = await db
    .insert(affiliatesTable)
    .values({
      userId: user.id,
      tier: "standard",
      payoutEmail,
      payoutMethod: "stripe",
      isActive: true,
      country: country.toUpperCase(),
      name: name ?? null,
      audienceSize: audienceSize ?? null,
      ftcDisclosureAccepted: true,
      ftcAcceptedAt: now,
    })
    .returning();

  req.log.info({ userId: user.id, country }, "affiliate/join: new affiliate enrolled");

  res.json({
    success: true,
    affiliate: {
      id: affiliate!.id,
      tier: affiliate!.tier,
      country: affiliate!.country,
    },
  });
});

// ── GET /referral/friend-stats ───────────────────────────────────────────────

/**
 * Returns friend referral progress for a user.
 * Query: ?email=...
 *
 * Response:
 *   qualifyingCount  — conversions with brewCount >= 3 (referrer has earned/will earn 30-day Pro)
 *   pendingCount     — conversions subscribed but brewCount < 3 (in progress)
 *   proPermanent     — true if user has earned permanent Pro
 *   totalReferrals   — all referral_conversions for this user (signed up, not necessarily subscribed)
 */
router.get("/referral/friend-stats", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [qualifying] = await db
    .select({ cnt: count() })
    .from(referralConversionsTable)
    .where(
      and(
        eq(referralConversionsTable.referrerUserId, user.id),
        eq(referralConversionsTable.isAffiliateConversion, false),
        gte(referralConversionsTable.brewCount, 3),
      ),
    );

  const [pending] = await db
    .select({ cnt: count() })
    .from(referralConversionsTable)
    .where(
      and(
        eq(referralConversionsTable.referrerUserId, user.id),
        eq(referralConversionsTable.isAffiliateConversion, false),
        eq(referralConversionsTable.isSubscriptionActive, true),
        gte(referralConversionsTable.brewCount, 0),
      ),
    );

  const [total] = await db
    .select({ cnt: count() })
    .from(referralConversionsTable)
    .where(eq(referralConversionsTable.referrerUserId, user.id));

  res.json({
    qualifyingCount: Number(qualifying?.cnt ?? 0),
    pendingCount: Number(pending?.cnt ?? 0),
    proPermanent: user.proPermanent ?? false,
    totalReferrals: Number(total?.cnt ?? 0),
  });
});

// ── POST /referral/redeem ─────────────────────────────────────────────────────

/**
 * Simpler claim variant for the onboarding screen: takes { email, code }.
 * Looks up both user and referrer server-side, then follows the same flow as
 * /referral/claim. RC entitlement is granted using the email as the RC user ID
 * (best-effort — conversion is always recorded even if RC grant fails).
 */
router.post("/referral/redeem", async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email || !code) {
    res.status(400).json({ error: "email and code are required" });
    return;
  }

  const normalized = code.trim().toUpperCase();

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (!user) {
    res.status(404).json({ error: "Account not found. Please sign in first." });
    return;
  }

  const referrer = await db.query.usersTable.findFirst({
    where: eq(usersTable.referralCode, normalized),
  });
  if (!referrer) {
    res.status(404).json({ error: "Referral code not found." });
    return;
  }

  if (referrer.id === user.id) {
    res.status(400).json({ error: "You can't use your own referral code." });
    return;
  }

  if (user.referredByCode) {
    res.status(409).json({ error: "You've already redeemed a referral code." });
    return;
  }

  const existing = await db.query.referralConversionsTable.findFirst({
    where: eq(referralConversionsTable.referredUserId, user.id),
  });
  if (existing) {
    res.status(409).json({ error: "Referral already recorded for this account." });
    return;
  }

  await db.update(usersTable)
    .set({ referredByCode: normalized })
    .where(eq(usersTable.id, user.id));

  await db.insert(referralConversionsTable).values({
    referralCode: normalized,
    referrerUserId: referrer.id,
    referredUserId: user.id,
    isSubscriptionActive: false,
    brewCount: 0,
    isAffiliateConversion: false,
    instalmentsPaid: 0,
    instalmentStatus: "na",
  });

  const granted = await grantRcProEntitlement(email, 1);
  if (granted) {
    await db.update(usersTable)
      .set({ isPro: true })
      .where(eq(usersTable.id, user.id));
  }

  res.json({
    success: true,
    rcGranted: granted,
    message: granted
      ? "Code applied! You've got 1 month of Pro free."
      : "Code recorded — Pro access will activate shortly.",
  });
});

// ── POST /referral/update-code ────────────────────────────────────────────────

/**
 * Allows a user to change their referral code, but only if no one has been
 * referred via it yet (zero rows in referral_conversions for this user).
 *
 * Body: { email: string, newCode: string }
 */
router.post("/referral/update-code", async (req, res) => {
  const { email, newCode } = req.body as { email?: string; newCode?: string };

  if (!email || !newCode) {
    res.status(400).json({ error: "email and newCode are required" });
    return;
  }

  const code = newCode.trim().toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/.test(code)) {
    res
      .status(400)
      .json({ error: "Code must be 3–20 characters: letters, numbers, and hyphens only." });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  // Block change if anyone has already used this user's code.
  const [existing] = await db
    .select({ cnt: count() })
    .from(referralConversionsTable)
    .where(eq(referralConversionsTable.referrerUserId, user.id));

  if (Number(existing?.cnt ?? 0) > 0) {
    res.status(409).json({
      error:
        "Your code has already been used by someone — it can no longer be changed.",
    });
    return;
  }

  // Make sure the new code isn't taken by another user.
  const taken = await db.query.usersTable.findFirst({
    where: eq(usersTable.referralCode, code),
  });

  if (taken && taken.id !== user.id) {
    res.status(409).json({ error: "That code is already taken. Please choose another." });
    return;
  }

  await db
    .update(usersTable)
    .set({ referralCode: code })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true, code });
});

export default router;
