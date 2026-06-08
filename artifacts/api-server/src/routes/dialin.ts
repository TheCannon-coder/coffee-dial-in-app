import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router = Router();

const FREE_BREW_LIMIT = 10;
const ANON_BREW_LIMIT = 3;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function makeReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const VALID_ADJUSTMENTS = [
  "grind_finer",
  "grind_coarser",
  "more_coffee",
  "less_coffee",
  "steep_longer",
  "steep_shorter",
  "none",
] as const;

router.post("/dialin", async (req, res) => {
  const {
    email,
    anonId,
    method,
    coffeeName,
    dose,
    water,
    brewTime,
    waterTemp,
    grinderNotes,
    tastingNotes,
    freeNotes,
    adjustmentHistory,
  } = req.body as {
    email?: string;
    anonId?: string;
    method: string;
    coffeeName?: string;
    dose?: string;
    water?: string;
    brewTime?: string;
    waterTemp?: string;
    grinderNotes?: string;
    tastingNotes: string;
    freeNotes?: string;
    adjustmentHistory?: string[];
  };

  if (!tastingNotes && !freeNotes) {
    res.status(400).json({ error: "tastingNotes required" });
    return;
  }

  const monthKey = currentMonthKey();

  try {
    // Find or create user
    let user = email
      ? await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) })
      : anonId
      ? await db.query.usersTable.findFirst({ where: eq(usersTable.anonId, anonId) })
      : null;

    if (!user) {
      const referralCode = makeReferralCode();
      const [created] = await db
        .insert(usersTable)
        .values({
          email: email ?? null,
          anonId: anonId ?? null,
          isPro: false,
          usesThisMonth: 0,
          monthKey,
          referralCode,
        })
        .returning();
      user = created;
    }

    // Reset monthly count if month rolled over
    if (user.monthKey !== monthKey) {
      await db
        .update(usersTable)
        .set({ usesThisMonth: 0, monthKey })
        .where(eq(usersTable.id, user.id));
      user = { ...user, usesThisMonth: 0, monthKey };
    }

    // Enforce limits
    if (!user.isPro) {
      const limit = email ? FREE_BREW_LIMIT : ANON_BREW_LIMIT;
      if (user.usesThisMonth >= limit) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        res.json({ error: "limit_reached", resetsOn: nextMonth.toISOString() });
        return;
      }
    }

    // Build AI prompt
    const brewDetails = [
      method && `Brew method: ${method}`,
      coffeeName && `Coffee: ${coffeeName}`,
      dose && `Dose: ${dose}`,
      water && `Water: ${water}`,
      brewTime && `Brew time: ${brewTime}`,
      waterTemp && `Water temp: ${waterTemp}`,
      grinderNotes && `Notes: ${grinderNotes}`,
    ]
      .filter(Boolean)
      .join("\n");

    const historyNote =
      adjustmentHistory && adjustmentHistory.length > 0
        ? `Previous adjustments made: ${adjustmentHistory.join(", ")}.`
        : "";

    const prompt = `You are a specialty coffee coach helping someone dial in their brew.

${brewDetails}

Tasting notes: ${tastingNotes}${freeNotes ? `\nAdditional notes: ${freeNotes}` : ""}
${historyNote}

## How to interpret tasting notes

UNAMBIGUOUS OVEREXTRACTION signals (grind coarser or steep shorter):
- Bitter, Harsh, Dry, Astringent, Chalky, Burnt, Lingers too long
- Diagnose overextraction when 2+ of these appear together

UNAMBIGUOUS LOW BODY signals (more coffee / dose up):
- Weak, Thin, Watery, Tea-like → the brew lacks weight and presence

UNAMBIGUOUS UNDEREXTRACTION signals (grind finer or steep longer):
- Sour, Sharp, Tart, Metallic, Green / grassy, Short finish

AMBIGUOUS — resolve by context:
- "Flat" can indicate EITHER overextraction OR low body. Do not use it alone to diagnose either.
  → If "Flat" appears alongside overextraction signals (Bitter, Harsh, Dry, Astringent, Burnt…) → overextraction
  → If "Flat" appears alongside body signals (Weak, Thin, Watery, Tea-like) → low body
  → If "Flat" appears with neither cluster, lean toward low body (overextraction almost always has at least one other bitter/harsh signal)
- "No sweetness" is similarly ambiguous — weigh it against the rest

MIXED / nuanced:
- If the cup shows BOTH good notes (Bright, Balanced, Clean, Smooth, Silky) AND body complaints (Weak, Thin, Tea-like, and/or Flat with no bitter cluster), extraction is likely correct — the issue is body only. Recommend more coffee (dose up) rather than changing grind direction.

## Your task

Look at the full picture. Identify the single most impactful change. Give one clear, specific, friendly tip (2–3 sentences max), referencing their actual numbers where relevant. Then pick exactly one adjustment key from: grind_finer, grind_coarser, more_coffee, less_coffee, steep_longer, steep_shorter, none.

Respond ONLY with valid JSON, no markdown:
{"advice": "...", "adjustment": "..."}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            'You are a specialty coffee coach. Always respond with valid JSON only — no markdown, no code fences. Format: {"advice": "string", "adjustment": "string"}',
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    logger.info(
      {
        raw,
        choicesLen: response.choices.length,
        finishReason: response.choices[0]?.finish_reason,
        model: response.model,
      },
      "AI response received",
    );

    let advice = "Try grinding slightly finer — sour and thin flavours usually mean under-extraction.";
    let adjustment = "grind_finer";

    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(cleaned) as { advice?: string; adjustment?: string };
      if (parsed.advice) advice = parsed.advice;
      if (
        parsed.adjustment &&
        VALID_ADJUSTMENTS.includes(parsed.adjustment as (typeof VALID_ADJUSTMENTS)[number])
      ) {
        adjustment = parsed.adjustment;
      }
    } catch {
      logger.warn({ raw }, "Failed to parse AI response, using fallback");
    }

    // Increment usage
    const newCount = user.usesThisMonth + 1;
    await db
      .update(usersTable)
      .set({ usesThisMonth: newCount })
      .where(eq(usersTable.id, user.id));

    const limit = email ? FREE_BREW_LIMIT : ANON_BREW_LIMIT;
    const usesRemaining = user.isPro ? FREE_BREW_LIMIT : Math.max(0, limit - newCount);

    res.json({ advice, adjustment, usesRemaining, isPro: user.isPro });
  } catch (err) {
    logger.error({ err }, "dialin error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
