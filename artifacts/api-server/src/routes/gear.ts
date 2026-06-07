import { createHash } from "crypto";
import { Router } from "express";
import { db, gearClicksTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Product catalogue.
 *
 * HOW TO UPDATE THESE LINKS:
 * 1. Go to your Amazon Associates dashboard (affiliate-program.amazon.com)
 * 2. Search for each product and use SiteStripe to generate a link
 * 3. Replace the `amazonUrl` values below with your generated links (they include your tag)
 * 4. Set AMAZON_AFFILIATE_TAG in Replit Secrets — this gets appended automatically
 *    if the URL doesn't already contain a tag parameter.
 */
const PRODUCTS: Record<string, { name: string; amazonUrl: string }> = {
  "timemore-black-mirror": {
    name: "Timemore Black Mirror Scale",
    amazonUrl: "https://www.amazon.com/dp/B079K4LS2X",
  },
  "acaia-pearl": {
    name: "Acaia Pearl Scale",
    amazonUrl: "https://www.amazon.com/dp/B00U7ESGIA",
  },
  "fellow-stagg-ekg": {
    name: "Fellow Stagg EKG Electric Kettle",
    amazonUrl: "https://www.amazon.com/dp/B07GGRJ3VQ",
  },
  "bonavita-variable": {
    name: "Bonavita 1L Variable Temperature Kettle",
    amazonUrl: "https://www.amazon.com/dp/B005YR0F40",
  },
  "timemore-c3-pro": {
    name: "Timemore C3 Pro Hand Grinder",
    amazonUrl: "https://www.amazon.com/dp/B08NGZZJWB",
  },
  "fellow-ode-gen2": {
    name: "Fellow Ode Brew Grinder Gen 2",
    amazonUrl: "https://www.amazon.com/dp/B0BBLZ5ZBP",
  },
};

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

/**
 * GET /api/gear/stats
 * Returns click counts per product. Must be declared before /:productId.
 */
router.get("/gear/stats", async (req, res) => {
  try {
    const rows = await db.execute<{ product_id: string; product_name: string; clicks: string }>(
      `SELECT product_id, product_name, COUNT(*) AS clicks
       FROM gear_clicks
       GROUP BY product_id, product_name
       ORDER BY clicks DESC`
    );

    res.json({
      stats: rows.rows.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        clicks: Number(r.clicks),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "failed to fetch gear stats");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/gear/:productId
 * Records the click and redirects to the Amazon affiliate URL.
 */
router.get("/gear/:productId", async (req, res) => {
  const { productId } = req.params;
  const product = PRODUCTS[productId];

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const affiliateUrl = buildAffiliateUrl(product.amazonUrl);

  // Record click (fire and forget — don't block the redirect)
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";

  db.insert(gearClicksTable)
    .values({
      productId,
      productName: product.name,
      ipHash: hashIp(ip),
      userAgent: req.headers["user-agent"] ?? null,
    })
    .then(() => {
      req.log.info({ productId, productName: product.name }, "gear click recorded");
    })
    .catch((err: unknown) => {
      req.log.error({ err, productId }, "failed to record gear click");
    });

  res.redirect(302, affiliateUrl);
});

export default router;
