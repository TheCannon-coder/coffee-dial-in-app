import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, usersTable, referralConversionsTable, affiliatesTable, commissionLedgerTable } from "@workspace/db";
import { getStripe } from "../lib/stripe";
import { publicBaseUrl } from "../lib/base-url";
import { logger } from "../lib/logger";

const router = Router();

const FREE_BREW_LIMIT = 10;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function makeReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

router.post("/user", async (req, res) => {
  const { email, referralCode: usedCode } = req.body as {
    email?: string;
    referralCode?: string;
  };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  const monthKey = currentMonthKey();

  try {
    let user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    const isNewUser = !user;

    if (!user) {
      const referralCode = makeReferralCode();
      const [created] = await db
        .insert(usersTable)
        .values({
          email,
          isPro: false,
          usesThisMonth: 0,
          monthKey,
          referralCode,
          referredByCode: usedCode ?? null,
        })
        .returning();
      user = created;
    } else if (user.monthKey !== monthKey) {
      await db.update(usersTable).set({ usesThisMonth: 0, monthKey }).where(eq(usersTable.id, user.id));
      user = { ...user, usesThisMonth: 0, monthKey };
    }

    // Record referral conversion for new users that came via a referral code
    if (isNewUser && usedCode) {
      const referrer = await db.query.usersTable.findFirst({
        where: eq(usersTable.referralCode, usedCode),
      });
      if (referrer && referrer.id !== user.id) {
        await db.insert(referralConversionsTable).values({
          referralCode: usedCode,
          referrerUserId: referrer.id,
          referredUserId: user.id,
          isSubscriptionActive: false,
        });
      }
    }

    res.json({
      isPro: user.isPro,
      usesThisMonth: user.usesThisMonth,
      monthlyLimit: FREE_BREW_LIMIT,
      referralCode: user.referralCode ?? "",
    });
  } catch (err) {
    logger.error({ err }, "user error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/user/apple", async (req, res) => {
  const { appleUserId, email } = req.body as { appleUserId?: string; email?: string };
  if (!appleUserId) {
    res.status(400).json({ error: "appleUserId required" });
    return;
  }

  const monthKey = currentMonthKey();

  try {
    // Look up by Apple user ID first
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.appleUserId, appleUserId),
    });

    if (!user && email) {
      // First-time Apple sign-in: find or create by email, attach Apple user ID
      user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
      if (!user) {
        const referralCode = makeReferralCode();
        const [created] = await db
          .insert(usersTable)
          .values({ email, appleUserId, isPro: false, usesThisMonth: 0, monthKey, referralCode })
          .returning();
        user = created;
      } else {
        // Existing email account — attach Apple ID
        await db.update(usersTable).set({ appleUserId }).where(eq(usersTable.id, user.id));
        user = { ...user, appleUserId };
      }
    }

    if (!user) {
      res.status(400).json({ error: "email required for first-time sign-in" });
      return;
    }

    if (user.monthKey !== monthKey) {
      await db.update(usersTable).set({ usesThisMonth: 0, monthKey }).where(eq(usersTable.id, user.id));
      user = { ...user, usesThisMonth: 0, monthKey };
    }

    res.json({
      email: user.email ?? "",
      isPro: user.isPro,
      usesThisMonth: user.usesThisMonth,
      monthlyLimit: FREE_BREW_LIMIT,
      referralCode: user.referralCode ?? "",
    });
  } catch (err) {
    logger.error({ err }, "user/apple error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/referral-code", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    let code = user.referralCode;
    if (!code) {
      code = makeReferralCode();
      await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, user.id));
    }

    res.json({ code });
  } catch (err) {
    logger.error({ err }, "referral-code error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Payments ───────────────────────────────────────────────────────────────────

router.post("/create-checkout", async (req, res) => {
  const { email, plan } = req.body as { email?: string; plan?: "monthly" | "yearly" };
  if (!email || !plan) {
    res.status(400).json({ error: "email and plan required" });
    return;
  }

  const priceId =
    plan === "yearly"
      ? process.env["STRIPE_PRICE_ID_YEARLY"]
      : process.env["STRIPE_PRICE_ID_MONTHLY"];

  if (!priceId) {
    res.status(503).json({ error: "payment_not_configured" });
    return;
  }

  try {
    const stripe = getStripe();

    let user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    let customerId = user?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
      if (user) {
        await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, user.id));
      }
    }

    const baseUrl = publicBaseUrl();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/`,
      metadata: { email },
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "create-checkout error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/customer-portal", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user?.stripeCustomerId) {
      res.status(404).json({ error: "no_subscription_found" });
      return;
    }

    const stripe = getStripe();
    const baseUrl = publicBaseUrl();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: baseUrl,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    logger.error({ err }, "customer-portal error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Affiliate self-serve ────────────────────────────────────────────────────────

router.post("/affiliate/me", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) { res.status(404).json({ error: "user_not_found" }); return; }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });

    if (!affiliate) {
      res.json({ isAffiliate: false, referralCode: user.referralCode });
      return;
    }

    const [conversions, ledger] = await Promise.all([
      db.select().from(referralConversionsTable)
        .where(eq(referralConversionsTable.referrerUserId, user.id)),
      db.select().from(commissionLedgerTable)
        .where(eq(commissionLedgerTable.affiliateUserId, user.id)),
    ]);

    const totalConversions = conversions.length;
    const activeConversions = conversions.filter(c => c.isSubscriptionActive).length;
    const totalPaidCents = ledger.filter(e => e.status === "paid").reduce((s, e) => s + e.amountCents, 0);
    const pendingCents = ledger.filter(e => e.status === "pending").reduce((s, e) => s + e.amountCents, 0);
    const monthlyRateCents = affiliate.customMonthlyRateCents ?? 75;

    res.json({
      isAffiliate: true,
      tier: affiliate.tier,
      referralCode: user.referralCode,
      monthlyRateCents,
      totalConversions,
      activeConversions,
      totalPaidCents,
      pendingCents,
      estimatedMonthlyEarningsCents: activeConversions * monthlyRateCents,
    });
  } catch (err) {
    logger.error({ err }, "affiliate/me error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/affiliate/me/metrics", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
    if (!user) { res.status(404).json({ error: "user_not_found" }); return; }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, user.id),
    });
    if (!affiliate) { res.json({ isAffiliate: false, months: [] }); return; }

    const [conversions, ledger] = await Promise.all([
      db.select().from(referralConversionsTable)
        .where(eq(referralConversionsTable.referrerUserId, user.id))
        .orderBy(desc(referralConversionsTable.signedUpAt)),
      db.select().from(commissionLedgerTable)
        .where(eq(commissionLedgerTable.affiliateUserId, user.id)),
    ]);

    const convByMonth = new Map<string, number>();
    for (const c of conversions) {
      const key = c.signedUpAt.toISOString().slice(0, 7);
      convByMonth.set(key, (convByMonth.get(key) ?? 0) + 1);
    }
    const earnByMonth = new Map<string, number>();
    for (const e of ledger) {
      earnByMonth.set(e.periodMonth, (earnByMonth.get(e.periodMonth) ?? 0) + e.amountCents);
    }

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { month: key, newConversions: convByMonth.get(key) ?? 0, earningsCents: earnByMonth.get(key) ?? 0 };
    });

    res.json({ isAffiliate: true, months });
  } catch (err) {
    logger.error({ err }, "affiliate/me/metrics error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
