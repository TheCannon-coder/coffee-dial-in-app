import { Router } from "express";
import { randomUUID } from "crypto";
import { eq, and, isNull, ne, desc } from "drizzle-orm";
import { db, usersTable, brewsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import { recordBrewForReferral } from "../lib/affiliate-helpers";

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

const METHOD_ALIASES: Record<string, string> = {
  aeropress: "AeroPress",
  "aero press": "AeroPress",
  v60: "V60",
  "pour over": "Pour Over",
  "pour-over": "Pour Over",
  pourover: "Pour Over",
  chemex: "Chemex",
  espresso: "Espresso",
  "french press": "French Press",
  "french-press": "French Press",
  frenchpress: "French Press",
  "drip machine": "Drip Machine",
  dripmachine: "Drip Machine",
  drip: "Drip Machine",
  "moka pot": "Moka Pot",
  mokapot: "Moka Pot",
  moka: "Moka Pot",
  "kalita wave": "Kalita Wave",
  kalita: "Kalita Wave",
  "cold brew": "Cold Brew",
  coldbrew: "Cold Brew",
};

function normaliseMethod(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return METHOD_ALIASES[key] ?? raw.trim();
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
    brewComparison,
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
    brewComparison?: 'better' | 'same' | 'worse';
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

## METHOD-SPECIFIC ADJUSTMENT LOGIC

For immersion methods (AeroPress, French press, Clever Brewer):
- Over/underextraction is best fixed with TIME first (steep longer = more extraction, steep shorter = less extraction).
- Grind still affects BODY in these methods: finer grind = more body, coarser grind = less body.
- So for immersion: use steep_longer / steep_shorter for extraction problems; grind changes only when body is the issue.

For all other methods (V60, Pour over, Espresso, Chemex, Drip machine, Moka pot, etc.):
- Use grind adjustments for extraction (grind_finer / grind_coarser).
- Use more_coffee / less_coffee for body issues only.

## YOUR VOICE

You are a warm, casual coffee discovery partner — not a textbook. Use "we" and "let's" throughout. The process is exploratory ("let's see if this helps"), not prescriptive.

Emoji are welcome but use them naturally and sparingly.

## RESPONSE FORMAT

1–2 sentences MAX. Structure:
- One brief casual phrase that validates how the cup tasted (e.g. "Not the best," / "Kinda bland," / "Getting close!" / "Oof..." / "This sounds amazing!")
- Then: reassure it's fixable and give the single change + optional benefit

**Special case — great cup with tweakable body:**
If the cup is genuinely good (Sweet, Bright, Juicy, Balanced, Clean, Fruity, etc.) but also has a body note worth exploring (Heavy, Thick → could be lighter; Thin, Watery, Tea-like → could be fuller), use this two-sentence structure:
1. Celebrate the cup warmly
2. Offer a gentle optional exploration hint using "if you want to..." framing — casual, inviting, never prescriptive. Body tweaks: Heavy/Thick → less coffee; Thin/Watery → more coffee.
Adjustment key is still "none" — the cup is dialled in, the second line is just exploration.

Do NOT explain the diagnosis. Do NOT use technical extraction language. Just reflect the experience casually and give the one move.

## EXAMPLES (match this style and length exactly)

Sour, Sharp, Thin → "Not the best, but no worries :) Next time let's grind finer to bring out more sweetness."
Bitter, Harsh, Dry → "No worries, let's work to improve the next cup. Next time we'll grind coarser to get more fruitiness."
Flat, No sweetness, Watery (20g/300ml, Pour over) → "Kinda bland, but we can make it better :) For our next brew let's try a bit more coffee."
Astringent, Tart, Short finish (Espresso) → "Getting close! Let's grind a bit coarser next time and see if it helps :)"
Sweet, Bright, Juicy, Balanced → "This sounds like an amazing cup! Next time we'll keep everything exactly the same. Enjoy :)"
Sour, Astringent, Thin, Bitter (French press) → "Oof... no worries, we can fix this together :) Next time, let's brew for less time."
Clean, Juicy, Tropical, Heavy (Chemex) → "This sounds like an amazing cup! If you want to bring the body down a touch to round it out, you could always try a little less coffee next time."

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
            'You are a casual, warm coffee discovery partner. Keep advice to 1–2 short sentences. Use "we" and "let\'s". Validate briefly, reassure, give one fix. Never explain the diagnosis. Always respond with valid JSON only — no markdown, no code fences. Format: {"advice": "string", "adjustment": "string"}',
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

    // Find the previous brew's session ID (before inserting current) so the
    // client can write wasHelpful feedback to the brew that gave the advice.
    const prevBrew = await db.query.brewsTable.findFirst({
      where: and(
        eq(brewsTable.userId, user.id),
        ne(brewsTable.adjustment, "none"),
      ),
      orderBy: [desc(brewsTable.createdAt)],
      columns: { sessionId: true },
    });
    const prevSessionId = prevBrew?.sessionId ?? null;

    // Log the brew for training / anomaly detection
    await db.insert(brewsTable).values({
      userId: user.id,
      sessionId,
      method: normaliseMethod(method),
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
      comparedToPrevious: brewComparison ?? null,
    });

    const limit = email ? FREE_BREW_LIMIT : ANON_BREW_LIMIT;
    const usesRemaining = user.isPro ? FREE_BREW_LIMIT : Math.max(0, limit - newCount);

    res.json({ advice, adjustment, usesRemaining, isPro: user.isPro, sessionId, prevSessionId });

    recordBrewForReferral(user.id).catch((err) => {
      logger.warn({ err, userId: user.id }, "recordBrewForReferral failed (non-fatal)");
    });
  } catch (err) {
    logger.error({ err }, "dialin error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /brews/pending-feedback ──────────────────────────────────────────────
// Returns the most recent unrated brew (adjustment != none, wasHelpful null)
// for the given email user. Used by the home screen to gate the next brew.
router.get("/brews/pending-feedback", async (req, res) => {
  const { email } = req.query as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (!user) {
    res.json({ pending: null });
    return;
  }
  const brew = await db.query.brewsTable.findFirst({
    where: and(
      eq(brewsTable.userId, user.id),
      isNull(brewsTable.wasHelpful),
      eq(brewsTable.feedbackIgnored, false),
      ne(brewsTable.adjustment, "none"),
    ),
    orderBy: [desc(brewsTable.createdAt)],
  });
  if (!brew) {
    res.json({ pending: null });
    return;
  }
  res.json({
    pending: {
      sessionId: brew.sessionId,
      adjustment: brew.adjustment,
      method: brew.method,
      coffeeName: brew.coffeeName,
    },
  });
});

// Dismisses a pending feedback prompt without recording wasHelpful. Used when
// the user swipes away the home-screen gate instead of answering it — we
// don't want to record a false "same or worse" signal for data we never got.
router.post("/brews/dismiss-feedback", async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }
  try {
    await db
      .update(brewsTable)
      .set({ feedbackIgnored: true })
      .where(eq(brewsTable.sessionId, sessionId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "dismiss-feedback error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/feedback", async (req, res) => {
  const { sessionId, wasHelpful } = req.body as { sessionId?: string; wasHelpful?: boolean };
  if (!sessionId || wasHelpful === undefined) {
    res.status(400).json({ error: "sessionId and wasHelpful required" });
    return;
  }
  try {
    await db
      .update(brewsTable)
      .set({ wasHelpful })
      .where(eq(brewsTable.sessionId, sessionId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "feedback error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
