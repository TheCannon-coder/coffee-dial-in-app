import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, androidWaitlistTable } from "@workspace/db";

const router = Router();

router.post("/waitlist", async (req, res) => {
  const { email, platform = "android" } = req.body as {
    email?: string;
    platform?: string;
  };

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "valid email required" });
    return;
  }

  const normalised = email.toLowerCase().trim();

  try {
    const existing = await db.query.androidWaitlistTable.findFirst({
      where: eq(androidWaitlistTable.email, normalised),
    });

    if (existing) {
      res.json({ ok: true, alreadyJoined: true });
      return;
    }

    await db.insert(androidWaitlistTable).values({ email: normalised, platform });

    req.log.info({ email: normalised.slice(0, 3) + "***" }, "android waitlist signup");
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "waitlist signup error");
    res.status(500).json({ error: "server error" });
  }
});

export default router;
