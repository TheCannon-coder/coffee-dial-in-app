import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, promoCodesTable, promoCodeRedemptionsTable, usersTable } from "@workspace/db";
import { grantProEntitlement } from "../lib/revenuecat";

const router = Router();

router.post("/promo/redeem", async (req, res) => {
  const { code, revenuecatId, email, anonId } = req.body as {
    code?: string;
    revenuecatId?: string;
    email?: string;
    anonId?: string;
  };

  if (!code || !revenuecatId) {
    res.status(400).json({ error: "code and revenuecatId are required" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const promo = await db.query.promoCodesTable.findFirst({
    where: eq(promoCodesTable.code, normalizedCode),
  });

  if (!promo || !promo.active) {
    res.status(404).json({ error: "Invalid promo code." });
    return;
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    res.status(400).json({ error: "This promo code has expired." });
    return;
  }

  if (promo.maxUses !== null && promo.useCount >= promo.maxUses) {
    res.status(400).json({ error: "This promo code has reached its limit." });
    return;
  }

  const existing = await db.query.promoCodeRedemptionsTable.findFirst({
    where: and(
      eq(promoCodeRedemptionsTable.promoCodeId, promo.id),
      eq(promoCodeRedemptionsTable.revenuecatCustomerId, revenuecatId),
    ),
  });

  if (existing) {
    res.status(409).json({ error: "You've already redeemed this code." });
    return;
  }

  try {
    const granted = await grantProEntitlement(revenuecatId, promo.rewardMonths);
    if (!granted) {
      req.log.error({ revenuecatId, code: normalizedCode }, "promo/redeem: RC grant failed");
      res.status(502).json({ error: "Could not activate your code. Please try again." });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.insert(promoCodeRedemptionsTable).values({
        promoCodeId: promo.id,
        revenuecatCustomerId: revenuecatId,
      });
      await tx
        .update(promoCodesTable)
        .set({ useCount: sql`${promoCodesTable.useCount} + 1` })
        .where(eq(promoCodesTable.id, promo.id));
      const userClause = email
        ? eq(usersTable.email, email)
        : anonId
        ? eq(usersTable.anonId, anonId)
        : null;
      if (userClause) {
        await tx.update(usersTable).set({ isPro: true }).where(userClause);
      }
    });

    req.log.info({ code: normalizedCode, revenuecatId }, "promo/redeem: redeemed");
    res.json({ message: "Code applied! Your Pro access is now active." });
  } catch (err) {
    req.log.error({ err }, "promo/redeem: unexpected error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
