import { Router } from "express";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, brewsTable } from "@workspace/db";
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
    sessionId: incomingSessionId,
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
    sessionId?: string;
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

  const sessionId = incomingSessionId ?? randomUUID();

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
- Sour, Sharp, Metallic, Green / grassy

AMBIGUOUS — resolve by context:
- "Tart" can indicate EITHER underextraction OR overextraction. Do not use it alone.
  → If "Tart" appears alongside other underextraction signals (Sour, Sharp, Metallic) → underextraction (grind finer)
  → If "Tart" appears alongside overextraction signals (Bitter, Harsh, Dry, Astringent, Burnt…) → overextraction (grind coarser)
  → If "Tart" appears with neither cluster, lean toward underextraction
- "Short finish" can indicate EITHER underextraction OR overextraction. Do not use it alone.
  → If "Short finish" appears alongside overextraction signals (Astringent, Bitter, Dry, Burnt…) → overextraction (grind coarser)
  → If "Short finish" appears alongside underextraction signals (Sour, Sharp, Metallic) → underextraction (grind finer)
  → If "Short finish" appears with neither cluster, lean toward underextraction
- "Flat" can indicate EITHER overextraction OR low body. Do not use it alone to diagnose either.
  → If "Flat" appears alongside overextraction signals (Bitter, Harsh, Dry, Astringent, Burnt…) → overextraction
  → If "Flat" appears alongside body signals (Weak, Thin, Watery, Tea-like) → low body
  → If "Flat" appears with neither cluster, lean toward low body (overextraction almost always has at least one other bitter/harsh signal)
- "No sweetness" is similarly ambiguous — weigh it against the rest

EXTRACTION VS. BODY — fix extraction first:
- If the cup shows body signals (Thin, Weak, Watery, Tea-like) AND extraction signals (Astringent, Bitter, Dry, Sour, Sharp), address the extraction issue first.
- Reason: a properly extracted cup may naturally have adequate body; adding more coffee while extraction is off can amplify the extraction fault (e.g. more dose in an astringent cup increases steep time and makes astringency worse).
- Once extraction is dialled in, reassess body separately if needed.

MIXED / nuanced:
- If the cup shows BOTH good notes (Bright, Balanced, Clean, Smooth, Silky) AND body complaints (Weak, Thin, Tea-like, and/or Flat with no bitter cluster), extraction is likely correct — the issue is body only. Recommend more coffee (dose up) rather than changing grind direction.

## Your task

Look at the full picture and identify the single most impactful change. Write your advice in exactly three beats — all in one short paragraph, 2–3 sentences total:

1. Validate — acknowledge how the cup tasted (don't repeat every note back, just reflect the experience briefly)
2. Assure — let them know this is fixable and normal
3. Fix — give the one specific change for the next brew, referencing their actual numbers where relevant

Keep it warm, encouraging, and concise. No bullet points. No technical jargon unless the user provided numbers (dose, grind setting, etc.). Sound like a knowledgeable friend, not a textbook.

Then pick exactly one adjustment key from: grind_finer, grind_coarser, more_coffee, less_coffee, steep_longer, steep_shorter, none.

Respond ONLY with valid JSON, no markdown:
{"advice": "...", "adjustment": "..."}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            'You are a warm, encouraging specialty coffee coach. Your advice always: (1) briefly validates how the cup tasted, (2) reassures the user it\'s fixable, (3) gives one specific change for the next brew. Keep it conversational, friendly, and under 3 sentences. Always respond with valid JSON only — no markdown, no code fences. Format: {"advice": "string", "adjustment": "string"}',
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

    // Log the brew for training / anomaly detection
    await db.insert(brewsTable).values({
      userId: user.id,
      sessionId,
      method: method ?? null,
      coffeeName: coffeeName ?? null,
      dose: dose ?? null,
      water: water ?? null,
      brewTime: brewTime ?? null,
      waterTemp: waterTemp ?? null,
      grinderNotes: grinderNotes ?? null,
      tastingNotes: tastingNotes ?? freeNotes ?? "",
      freeNotes: freeNotes ?? null,
      adjustmentHistory: adjustmentHistory ?? null,
      advice,
      adjustment,
      aiModel: response.model,
    });

    const limit = email ? FREE_BREW_LIMIT : ANON_BREW_LIMIT;
    const usesRemaining = user.isPro ? FREE_BREW_LIMIT : Math.max(0, limit - newCount);

    res.json({ advice, adjustment, usesRemaining, isPro: user.isPro, sessionId });
  } catch (err) {
    logger.error({ err }, "dialin error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
