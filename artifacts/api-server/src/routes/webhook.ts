/**
 * Stripe webhook handler.
 *
 * IMPORTANT: This router must be mounted BEFORE express.json() in app.ts
 * because Stripe signature verification requires the raw request body.
 *
 * Events handled:
 *   checkout.session.completed     → set isPro=true, record customer ID, credit affiliate
 *   invoice.paid                   → keep isPro=true on renewals
 *   customer.subscription.deleted  → set isPro=false, cancel referral conversion
 */

import { Router } from "express";
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, usersTable, referralConversionsTable } from "@workspace/db";
import { getStripe } from "../lib/stripe";
import { recordConversionSubscribed } from "../lib/affiliate-helpers";
import { logger } from "../lib/logger";

const router = Router();

type RawRequest = Request & { rawBody?: string };

router.post(
  "/stripe/webhook",
  (req: RawRequest, _res: Response, next) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => { req.rawBody = data; next(); });
  },
  async (req: RawRequest, res: Response) => {
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET not set — webhook disabled");
      res.status(503).json({ error: "webhook_not_configured" });
      return;
    }

    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) {
      res.status(400).json({ error: "missing_signature" });
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.rawBody ?? "", sig, webhookSecret);
    } catch (err) {
      logger.warn({ err }, "webhook signature verification failed");
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "invoice.paid":
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          break;
      }
      res.json({ received: true });
    } catch (err) {
      logger.error({ err, eventType: event.type }, "webhook handler error");
      res.status(500).json({ error: "handler_error" });
    }
  },
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const email = session.customer_details?.email ?? session.metadata?.["email"] ?? null;

  if (!customerId || !email) {
    logger.warn({ sessionId: session.id }, "checkout.session.completed missing customer/email");
    return;
  }

  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });
  if (!user) {
    logger.warn({ email }, "checkout completed for unknown email — creating user");
    const [created] = await db
      .insert(usersTable)
      .values({ email, isPro: true, stripeCustomerId: customerId, usesThisMonth: 0, monthKey: "" })
      .returning();
    user = created!;
  } else {
    await db
      .update(usersTable)
      .set({ isPro: true, stripeCustomerId: customerId })
      .where(eq(usersTable.id, user.id));
  }

  if (user.referredByCode && subscriptionId) {
    const referredConversion = await db.query.referralConversionsTable.findFirst({
      where: eq(referralConversionsTable.referredUserId, user.id),
    });
    if (referredConversion) {
      const planType = determinePlanType(session);
      await recordConversionSubscribed(referredConversion.id, planType, subscriptionId);
    }
  }

  logger.info({ email, customerId, subscriptionId }, "checkout completed — user upgraded to Pro");
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  if (!customerId) return;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.stripeCustomerId, customerId),
  });
  if (!user) {
    logger.warn({ customerId }, "invoice.paid for unknown customer");
    return;
  }

  if (!user.isPro) {
    await db.update(usersTable).set({ isPro: true }).where(eq(usersTable.id, user.id));
    logger.info({ email: user.email, customerId }, "invoice.paid — restored Pro status");
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.stripeCustomerId, customerId),
  });
  if (!user) {
    logger.warn({ customerId }, "subscription.deleted for unknown customer");
    return;
  }

  if (!user.proPermanent) {
    await db.update(usersTable).set({ isPro: false }).where(eq(usersTable.id, user.id));
  }

  const conversion = await db.query.referralConversionsTable.findFirst({
    where: eq(referralConversionsTable.referredUserId, user.id),
  });
  if (conversion?.isSubscriptionActive) {
    await db
      .update(referralConversionsTable)
      .set({ isSubscriptionActive: false, cancelledAt: new Date() })
      .where(eq(referralConversionsTable.id, conversion.id));
  }

  logger.info({ email: user.email, customerId }, "subscription deleted — downgraded from Pro");
}

function determinePlanType(session: Stripe.Checkout.Session): "monthly" | "annual" | "lifetime" {
  const amount = session.amount_total ?? 0;
  if (amount >= 4000) return "annual";
  return "monthly";
}

export default router;
