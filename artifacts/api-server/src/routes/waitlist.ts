import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, androidWaitlistTable } from "@workspace/db";
import { addToKlaviyoList } from "../lib/klaviyo.js";

const router = Router();

// Maps a waitlist `platform` value to the Klaviyo list it should feed.
// Only platforms with a configured list get pushed to Klaviyo.
const KLAVIYO_LIST_BY_PLATFORM: Record<string, string | undefined> = {
  affiliate: process.env["KLAVIYO_LIST_ID"],
};

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

    const listId = KLAVIYO_LIST_BY_PLATFORM[platform];

    if (existing) {
      res.json({ ok: true, alreadyJoined: true });
      // Still (re-)subscribe on Klaviyo — harmless if already subscribed,
      // and covers the case where Klaviyo was configured after they joined.
      if (listId) void addToKlaviyoList(normalised, listId);
      return;
    }

    await db.insert(androidWaitlistTable).values({ email: normalised, platform });

    req.log.info({ email: normalised.slice(0, 3) + "***" }, "android waitlist signup");
    res.json({ ok: true });

    if (listId) void addToKlaviyoList(normalised, listId);
  } catch (err) {
    req.log.error(err, "waitlist signup error");
    res.status(500).json({ error: "server error" });
  }
});

export default router;
