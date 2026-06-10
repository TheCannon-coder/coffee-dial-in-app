import { createHash } from "crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, gearClicksTable, gearProductsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import {
  gearRecommendCacheKey,
  getGearRecommendCache,
  setGearRecommendCache,
} from "../lib/gear-recommend-cache";

const router = Router();

// ── Experience level scorer ───────────────────────────────────────────────────

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

function scoreExperienceLevel(params: {
  missedDose: number;
  missedTemp: number;
  missedGrinder: number;
  brewCount: number;
}): ExperienceLevel {
  const { missedDose, missedTemp, missedGrinder, brewCount } = params;
  const totalMisses = missedDose + missedTemp + missedGrinder;
  if (brewCount >= 30 && totalMisses <= 1) return "advanced";
  if (brewCount >= 10 && totalMisses <= 3) return "intermediate";
  return "beginner";
}

// ── GearItem type (matches gear-tracker.ts) ───────────────────────────────────

type GearItem = {
  id: string;
  emoji: string;
  missingLabel: string;
  missCount: number;
  limitingAdvice: string;
  solutionText: string;
  productName: string;
  productPrice: string;
  affiliateUrl: string;
};

type AiPick = {
  slug: string;
  missingLabel: string;
  limitingAdvice: string;
  solutionText: string;
};

function slugToEmoji(slug: string): string {
  if (slug.includes("scale") || slug.includes("lunar") || slug.includes("mirror") || slug.includes("pearl")) return "⚖️";
  if (slug.includes("kettle")) return "🌡️";
  if (slug.includes("grinder") || slug.includes("sette") || slug.includes("c3") || slug.includes("ode")) return "⚙️";
  if (slug.includes("tamper")) return "🔧";
  if (slug.includes("screen")) return "🔩";
  if (slug.includes("v60") || slug.includes("hario")) return "☕";
  return "🛠️";
}

function buildAffiliateUrl(baseUrl: string): string {
  const tag = process.env.AMAZON_AFFILIATE_TAG;
  if (!tag) return baseUrl;

  // Don't double-add the tag if the URL already has one
  if (baseUrl.includes("tag=")) return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set("tag", tag);
  return url.toString();
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 16);
}

// ── GET /api/gear/recommend ───────────────────────────────────────────────────

router.get("/gear/recommend", async (req, res) => {
  if (!process.env.AMAZON_AFFILIATE_TAG) {
    res.json({ items: [] });
    return;
  }

  const rawMethod = (req.query["method"] as string | undefined) ?? "general";
  // Normalize method to catalogue keys (e.g. "pour over" → "pour_over")
  const method = rawMethod.toLowerCase().trim().replace(/[\s-]+/g, "_");
  const missedDose = Number(req.query["missedDose"] ?? 0);
  const missedTemp = Number(req.query["missedTemp"] ?? 0);
  const missedGrinder = Number(req.query["missedGrinder"] ?? 0);
  const brewCount = Number(req.query["brewCount"] ?? 0);

  const experienceLevel = scoreExperienceLevel({ missedDose, missedTemp, missedGrinder, brewCount });
  const isEspresso = method === "espresso";
  const levelOrder: Record<ExperienceLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  const userLevel = levelOrder[experienceLevel];

  const cacheKey = gearRecommendCacheKey({ method, missedDose, missedTemp, missedGrinder, experienceLevel });
  const cached = getGearRecommendCache(cacheKey);
  if (cached) {
    req.log.debug({ cacheKey }, "gear/recommend: cache hit");
    res.json({ items: cached.items, cachedAt: cached.cachedAt });
    return;
  }

  try {
    const allProducts = await db
      .select()
      .from(gearProductsTable)
      .where(eq(gearProductsTable.active, true));

    const candidates = allProducts.filter((p) => {
      // Espresso: must be tagged for espresso
      // All others: must match the exact method OR be tagged "general" (cross-method)
      const methodMatch = isEspresso
        ? p.brewMethods.includes("espresso")
        : p.brewMethods.includes(method) || p.brewMethods.includes("general");
      const levelMatch =
        (levelOrder[p.experienceLevel as ExperienceLevel] ?? 0) <= userLevel + 1;
      return methodMatch && levelMatch;
    });

    if (candidates.length === 0) {
      res.json({ items: [] });
      return;
    }

    const missContext: string[] = [];
    if (missedDose >= 3) missContext.push(`dose skipped ${missedDose} times (no scale)`);
    if (missedTemp >= 3) missContext.push(`water temperature skipped ${missedTemp} times (no temp-controlled kettle)`);
    if (missedGrinder >= 3) missContext.push(`grinder setting skipped ${missedGrinder} times (no grinder with numbered settings)`);

    const missContextStr = missContext.length > 0
      ? `The user has gaps: ${missContext.join("; ")}.`
      : "The user is logging all fields consistently.";

    const catalogueText = candidates
      .map((p) => `- slug: ${p.slug} | name: ${p.name} | price: ${p.priceLabel} | hint: ${p.descriptionHint}`)
      .join("\n");

    const systemPrompt = `You are a curious coffee coach — not a salesperson. You suggest gear only when it directly addresses a gap in the user's brewing practice. Your tone is warm, practical, and honest.

CRITICAL RULES:
1. Use possibility language ONLY: "might", "could", "may help", "worth considering". NEVER use "will", "definitely", "guaranteed", or any promise of improvement.
2. Write like a thoughtful barista friend, not a product marketer.
3. Keep each pitch to 1–2 sentences. Do not over-explain.
4. Only pick products that directly address a logged gap (missed dose, temp, or grinder). If no clear gap exists, return an empty array.
5. Pick 1 product maximum; pick 2 only if the user has two distinct gaps needing different tools.`;

    const userPrompt = `User profile:
- Brew method: ${method}
- Experience level: ${experienceLevel}
- Brew count: ${brewCount}
- ${missContextStr}

Available products:
${catalogueText}

Return a JSON array of 0–2 objects with these exact keys:
- "slug": product slug from the catalogue above
- "missingLabel": short gap label (e.g. "dose in grams", "water temperature", "grinder setting")
- "limitingAdvice": 1–2 sentences on the gap and why it limits coaching — using possibility language
- "solutionText": 1–2 sentences on the product and why it might help — using possibility language

Return ONLY valid JSON. No markdown. No explanation outside the array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";

    let picks: AiPick[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) picks = parsed.slice(0, 2);
    } catch {
      req.log.warn({ raw }, "gear/recommend: AI returned non-JSON");
      res.json({ items: [] });
      return;
    }

    const slugMap = new Map(candidates.map((p) => [p.slug, p]));

    const items: GearItem[] = picks
      .map((pick) => {
        const product = slugMap.get(pick.slug);
        if (!product) return null;
        return {
          id: pick.slug,
          emoji: slugToEmoji(pick.slug),
          missingLabel: pick.missingLabel,
          missCount: 0,
          limitingAdvice: pick.limitingAdvice,
          solutionText: pick.solutionText,
          productName: product.name,
          productPrice: product.priceLabel,
          affiliateUrl: `https://www.coffeebrew.coach/api/gear/${product.slug}?src=rec`,
        } satisfies GearItem;
      })
      .filter((item): item is GearItem => item !== null);

    setGearRecommendCache(cacheKey, items);
    req.log.debug({ cacheKey, count: items.length }, "gear/recommend: cache stored");
    res.json({ items, cachedAt: null });
  } catch (err) {
    req.log.error({ err }, "gear/recommend: failed");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/gear/stats ───────────────────────────────────────────────────────

router.get("/gear/stats", async (req, res) => {
  try {
    const rows = await db.execute<{
      product_id: string;
      product_name: string;
      source: string;
      clicks: string;
    }>(
      `SELECT product_id, product_name, source, COUNT(*) AS clicks
       FROM gear_clicks
       GROUP BY product_id, product_name, source
       ORDER BY product_id, source`,
    );

    // Pivot into per-product rows with source breakdown
    const byProduct = new Map<
      string,
      { productId: string; productName: string; total: number; recommendation: number; direct: number }
    >();

    for (const r of rows.rows) {
      const entry = byProduct.get(r.product_id) ?? {
        productId: r.product_id,
        productName: r.product_name,
        total: 0,
        recommendation: 0,
        direct: 0,
      };
      const count = Number(r.clicks);
      entry.total += count;
      if (r.source === "recommendation") entry.recommendation += count;
      else entry.direct += count;
      byProduct.set(r.product_id, entry);
    }

    const stats = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);

    res.json({ stats });
  } catch (err) {
    req.log.error({ err }, "failed to fetch gear stats");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── GET /api/gear/:productId — redirect + click tracking ─────────────────────

router.get("/gear/:productId", async (req, res) => {
  const { productId } = req.params;

  const dbProduct = await db.query.gearProductsTable
    .findFirst({ where: eq(gearProductsTable.slug, productId) })
    .catch(() => null);

  if (!dbProduct) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const affiliateUrl = buildAffiliateUrl(dbProduct.amazonUrl);

  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const src = (req.query["src"] as string | undefined) === "rec" ? "recommendation" : "direct";

  db.insert(gearClicksTable)
    .values({
      productId,
      productName: dbProduct.name,
      ipHash: hashIp(ip),
      userAgent: req.headers["user-agent"] ?? null,
      source: src,
    })
    .then(() => {
      req.log.info({ productId, productName: dbProduct.name }, "gear click recorded");
    })
    .catch((err: unknown) => {
      req.log.error({ err, productId }, "failed to record gear click");
    });

  res.redirect(302, affiliateUrl);
});

export default router;
