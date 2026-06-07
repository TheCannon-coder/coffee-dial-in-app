import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  const monthKey = currentMonthKey();

  try {
    let user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });

    if (!user) {
      const referralCode = makeReferralCode();
      const [created] = await db
        .insert(usersTable)
        .values({ email, isPro: false, usesThisMonth: 0, monthKey, referralCode })
        .returning();
      user = created;
    } else if (user.monthKey !== monthKey) {
      await db.update(usersTable).set({ usesThisMonth: 0, monthKey }).where(eq(usersTable.id, user.id));
      user = { ...user, usesThisMonth: 0, monthKey };
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

export default router;
