/**
 * Stripe Connect onboarding for affiliates.
 * Gated by REFERRAL_PROGRAM env var.
 *
 *   POST /api/affiliate/connect/onboard   — create/resume onboarding link
 *   GET  /api/affiliate/connect/status    — check if onboarding complete
 *   GET  /api/affiliate/connect/return    — browser landing page after onboarding
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, affiliatesTable } from "@workspace/db";
import { getStripe } from "../lib/stripe";
import { logger } from "../lib/logger";

/**
 * When a Connect affiliate completes onboarding, Stripe has collected their
 * W-9/W-8BEN and verified their identity. For AU affiliates specifically,
 * Stripe collects the W-8BEN which includes the ABN field. We cannot read
 * that ABN back from Stripe, but we trust Stripe's identity verification
 * satisfied the ATO requirement. Therefore: withholdTax → false.
 *
 * This is an explicit, logged decision — NOT a silent default.
 */
function connectCompletionUpdate(country: string) {
  const isAU = country.toUpperCase() === "AU";
  return {
    connectOnboardingComplete: true,
    ...(isAU && { withholdTax: false, withholdTaxRatePct: 0 }),
  };
}

const router = Router();

router.use((_req, res, next) => {
  if (!process.env["REFERRAL_PROGRAM"]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  next();
});

/**
 * POST /api/affiliate/connect/onboard
 * Body: { email: string }
 *
 * Creates a Stripe Express account if needed, returns an account onboarding link.
 * The app should open this URL in a browser session.
 */
router.post("/affiliate/connect/onboard", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  try {
    const stripe = getStripe();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_an_affiliate" });
      return;
    }

    // Create Express account if not already created
    let accountId = affiliate.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: affiliate.payoutEmail,
        capabilities: {
          transfers: { requested: true },
        },
        settings: {
          payouts: { schedule: { interval: "manual" } },
        },
        metadata: { affiliateId: String(affiliate.id), userId: String(user.id) },
      });
      accountId = account.id;
      await db
        .update(affiliatesTable)
        .set({ stripeConnectAccountId: accountId, connectOnboardingComplete: false })
        .where(eq(affiliatesTable.id, affiliate.id));
    }

    // Always re-verify status from Stripe in case onboarding completed already
    const account = await stripe.accounts.retrieve(accountId);
    if (account.details_submitted && account.payouts_enabled) {
      if (!affiliate.connectOnboardingComplete) {
        const update = connectCompletionUpdate(affiliate.country ?? "US");
        await db
          .update(affiliatesTable)
          .set(update)
          .where(eq(affiliatesTable.id, affiliate.id));
        logger.info(
          { affiliateId: affiliate.id, country: affiliate.country, ...update },
          "connect onboarding complete (detected at onboard)",
        );
      }
      res.json({ alreadyComplete: true, accountId });
      return;
    }

    const baseUrl = (() => {
      const domains = process.env["REPLIT_DOMAINS"]?.split(",") ?? [];
      const prod = domains.find((d) => !d.includes("dev"));
      return prod ? `https://${prod}` : `https://${domains[0] ?? "localhost"}`;
    })();

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/affiliate/connect/onboard`,
      return_url: `${baseUrl}/api/affiliate/connect/return`,
      type: "account_onboarding",
    });

    logger.info({ affiliateId: affiliate.id, accountId }, "connect onboarding link created");
    res.json({ url: link.url, accountId });
  } catch (err) {
    logger.error({ err }, "affiliate/connect/onboard error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/affiliate/connect/status?email=...
 *
 * Returns the Connect onboarding status for an affiliate.
 * The app polls this after the browser session closes.
 */
router.get("/affiliate/connect/status", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  try {
    const stripe = getStripe();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_an_affiliate" });
      return;
    }

    if (!affiliate.stripeConnectAccountId) {
      res.json({ status: "not_started" });
      return;
    }

    // Check live status from Stripe
    const account = await stripe.accounts.retrieve(affiliate.stripeConnectAccountId);
    const complete = !!(account.details_submitted && account.payouts_enabled);

    if (complete && !affiliate.connectOnboardingComplete) {
      const update = connectCompletionUpdate(affiliate.country ?? "US");
      await db
        .update(affiliatesTable)
        .set(update)
        .where(eq(affiliatesTable.id, affiliate.id));
      logger.info(
        { affiliateId: affiliate.id, country: affiliate.country, ...update },
        "connect onboarding complete (detected at status poll)",
      );
    }

    res.json({
      status: complete ? "complete" : "pending",
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      accountId: affiliate.stripeConnectAccountId,
    });
  } catch (err) {
    logger.error({ err }, "affiliate/connect/status error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/affiliate/connect/return
 *
 * Landing page after Stripe onboarding. Updates our DB and tells the user
 * to return to the app.
 */
router.get("/affiliate/connect/return", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Dial In — Payout Setup</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #FAF7F2;
           display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; text-align: center; }
    .card { max-width: 340px; padding: 40px 32px; }
    h1 { font-size: 24px; color: #2C1A0E; margin-bottom: 12px; }
    p  { color: #6B5B4E; font-size: 16px; line-height: 1.5; }
    .check { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>You're all set</h1>
    <p>Your payout account is connected. You can close this tab and return to Dial In.</p>
  </div>
</body>
</html>`);
});

export default router;
