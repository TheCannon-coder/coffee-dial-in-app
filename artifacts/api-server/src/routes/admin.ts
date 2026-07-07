/**
 * Admin API — all routes protected by X-Admin-Key header.
 * Set ADMIN_KEY env var to a strong secret before exposing to the internet.
 *
 * Affiliates:
 *   GET    /api/admin/affiliates                      list with earnings summary
 *   POST   /api/admin/affiliates                      create affiliate
 *   GET    /api/admin/affiliates/:id                  detail with conversions
 *   PATCH  /api/admin/affiliates/:id                  update tier / payout info
 *   POST   /api/admin/affiliates/:id/set-code         assign custom referral code
 *   POST   /api/admin/affiliates/:id/recompute-tier   recompute tier from active referred subscriber count
 *   POST   /api/admin/affiliates/:id/clear-outreach-flag  clear founder_outreach_pending after Platinum outreach
 *
 * Tiers auto-promote based on active referred subscribers (never demote):
 *   standard: 0-9, silver: 10-99, gold: 100-999, platinum: 1,000+
 *   Crossing into Platinum stamps platinum_achieved_at, sets
 *   founder_outreach_pending=true, and sends a congratulations email.
 *
 * Conversions:
 *   GET    /api/admin/conversions             list all referral conversions
 *   POST   /api/admin/conversions/:id/subscribe  mark subscribed (creates commission)
 *   POST   /api/admin/conversions/:id/cancel     cancel subscription
 *
 * Payouts:
 *   GET    /api/admin/payouts                 list batches
 *   POST   /api/admin/payouts/generate        generate draft batch for a month
 *   GET    /api/admin/payouts/:id             batch detail + line items (CSV-ready)
 *   POST   /api/admin/payouts/:id/approve     approve batch
 *   POST   /api/admin/payouts/:id/complete    mark as sent / completed
 *
 * Rates:
 *   GET    /api/admin/rates                   list all phases
 *   GET    /api/admin/rates/current           current active rate per tier+planType
 *   POST   /api/admin/rates/phase             add a new phase (can set triggers)
 *   POST   /api/admin/rates/check-triggers    auto-activate phases whose triggers fired
 */

import { Router } from "express";
import { createHash } from "crypto";
import { eq, and, desc, sql, inArray, isNull, lte, or } from "drizzle-orm";
import { usdCentsToEurCents, isEuMemberState } from "../lib/compliance-utils";
import { db, usersTable, gearProductsTable, GEAR_EXPERIENCE_LEVELS } from "@workspace/db";
import { invalidateGearRecommendCache } from "../lib/gear-recommend-cache";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  affiliatesTable,
  referralConversionsTable,
  commissionLedgerTable,
  payoutBatchesTable,
  commissionPhasesTable,
  taxRecordsTable,
  promoCodesTable,
  promoCodeRedemptionsTable,
} from "@workspace/db";
import { getStripe } from "../lib/stripe";
import { logger } from "../lib/logger";
import {
  getCurrentRates,
  resolveRateCents,
  ensureRatesLocked,
  promoteAffiliateTierIfEligible,
  assertRateWillExistForConversion,
  MissingCommissionRateError,
} from "../lib/affiliate-helpers";

const router = Router();

// ── Payout skip alert ─────────────────────────────────────────────────────────

/**
 * Best-effort admin alert email (via Resend) when a payout batch is generated
 * with skipped entries due to missing commission_phases rates.
 *
 * Requires RESEND_API_KEY and ADMIN_EMAIL env vars. If either is absent the
 * function logs a warning and no-ops — same feature-flag convention used
 * throughout the codebase (never fails the calling request).
 */
async function sendPayoutSkipAlert({
  periodMonth,
  batchId,
  skippedEntries,
}: {
  periodMonth: string;
  batchId: number;
  skippedEntries: { conversionId: number; affiliateUserId: number; tier: string; reason: string }[];
}): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const adminEmail = process.env["ADMIN_EMAIL"];

  if (!apiKey || !adminEmail) {
    logger.warn(
      { hasResendKey: Boolean(apiKey), hasAdminEmail: Boolean(adminEmail) },
      "payout skip alert suppressed — RESEND_API_KEY and/or ADMIN_EMAIL not set",
    );
    return;
  }

  const rows = skippedEntries
    .map(
      (e) =>
        `<tr><td>${e.conversionId}</td><td>${e.affiliateUserId}</td><td>${e.tier}</td><td>${e.reason}</td></tr>`,
    )
    .join("");

  const html = `
<p><strong>⚠️ Payout batch for ${periodMonth} (batch #${batchId}) was generated with ${skippedEntries.length} skipped affiliate(s).</strong></p>
<p>These affiliates will <em>not</em> be paid until the missing commission_phases rates are configured and the batch is regenerated.</p>
<p>To fix: add the missing rate rows via <code>POST /api/admin/rates/phase</code>, then regenerate the batch via <code>POST /api/admin/payouts/generate</code> with <code>periodMonth: "${periodMonth}"</code>.</p>
<table border="1" cellpadding="4" cellspacing="0">
  <thead><tr><th>Conversion ID</th><th>Affiliate User ID</th><th>Tier</th><th>Reason</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dial In <hello@coffeebrew.coach>",
      to: adminEmail,
      subject: `⚠️ Payout batch ${periodMonth} skipped ${skippedEntries.length} affiliate(s) — action required`,
      html,
    }),
  });

  if (!response.ok) {
    logger.error(
      { status: response.status, periodMonth, batchId },
      "payout skip alert email failed to send",
    );
  } else {
    logger.info({ periodMonth, batchId, skippedCount: skippedEntries.length }, "payout skip alert email sent");
  }
}

// ── Auth middleware ────────────────────────────────────────────────────────────

/**
 * Admin auth middleware.
 * Supports two schemes so both API clients and browsers are covered:
 *  1. X-Admin-Key header (existing API clients, curl)
 *  2. HTTP Basic Auth (browser form submissions — any username, password = ADMIN_KEY)
 */
/** Short-lived cookie token = first 24 chars of SHA-256(ADMIN_KEY). Not a secret, just a session marker. */
function adminCookieToken(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const idx = c.indexOf("=");
      return idx === -1 ? [c.trim(), ""] : [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    }),
  );
}

function parseAdminKey(req: import("express").Request, expected: string): boolean {
  // 1. X-Admin-Key header (API clients / curl)
  if (req.headers["x-admin-key"] === expected) return true;

  // 2. HTTP Basic Auth (browser form login)
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx !== -1 && decoded.slice(colonIdx + 1) === expected) return true;
  }

  // 3. Session cookie (set after Basic Auth; used by JS fetch calls on admin pages)
  const cookies = parseCookies(req.headers["cookie"]);
  if (cookies["admin_tok"] === adminCookieToken(expected)) return true;

  return false;
}

router.use((req, res, next) => {
  if (!req.path.startsWith("/admin")) { next(); return; }

  const expected = process.env["ADMIN_KEY"];
  if (!expected) {
    res.status(503).json({ error: "admin_not_configured" });
    return;
  }

  if (!parseAdminKey(req, expected)) {
    // For browser page-loads without any credential, send Basic Auth challenge
    const acceptsHtml = req.headers["accept"]?.includes("text/html");
    const hasCred = req.headers["x-admin-key"] || req.headers["authorization"] || parseCookies(req.headers["cookie"])["admin_tok"];
    if (acceptsHtml && !hasCred) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Dial In Admin"');
      res.status(401).send("Authentication required. Enter your admin key as the password.");
      return;
    }
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // Set/refresh session cookie so JS fetch calls on admin pages stay authenticated
  res.cookie("admin_tok", adminCookieToken(expected), {
    httpOnly: true,
    sameSite: "strict",
    path: "/api/admin",
    maxAge: 4 * 60 * 60 * 1000, // 4 hours
  });

  next();
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns the previous calendar month as "YYYY-MM".
 * Used as the default period when generating a payout batch so that running
 * the job at the end of month M automatically covers month M-1 commissions.
 */
function previousMonth(): string {
  const d = new Date();
  const m = d.getMonth(); // 0-indexed
  if (m === 0) return `${d.getFullYear() - 1}-12`;
  return `${d.getFullYear()}-${String(m).padStart(2, "0")}`;
}

/**
 * Returns the last calendar day of the month following periodMonth.
 * This is the earliest date a batch may be processed — enforcing the rule
 * that affiliates are always paid one full month after they earn commissions.
 *
 * Examples:
 *   "2026-04" → "2026-05-31"  (April earnings paid no sooner than May 31)
 *   "2026-12" → "2027-01-31"  (December earnings paid no sooner than Jan 31)
 */
function calcProcessableAfter(periodMonth: string): string {
  const [year, month] = periodMonth.split("-").map(Number);
  // new Date(year, month+1, 0) = last day of month (month is 1-indexed here,
  // Date months are 0-indexed, so month+1 in Date = month+2 calendar month,
  // and day 0 of that = last day of month+1).
  const d = new Date(year, month + 1, 0);
  return d.toISOString().split("T")[0]!;
}

// ── Dashboard HTML ─────────────────────────────────────────────────────────────

router.get("/admin", async (_req, res) => {
  try {
    const [statsRows, todayRows, recentUsers] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE is_pro)::int AS pro_users,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')::int AS today_users
        FROM users
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS today_brews
        FROM brews
        WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
      `),
      db.execute(sql`
        SELECT id, email, apple_user_id, is_pro, uses_this_month, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 200
      `),
    ]);

    const stats = (statsRows.rows[0] ?? {}) as Record<string, number>;
    const brews = (todayRows.rows[0] ?? {}) as Record<string, number>;

    type UserRow = { id: number; email: string | null; apple_user_id: string | null; is_pro: boolean; uses_this_month: number; created_at: string };
    const users = recentUsers.rows as UserRow[];

    const fmt = (d: string) => {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) +
        " " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/New_York" });
    };

    const rows = users.map(u => {
      const isAppleRelay = (u.email ?? "").includes("privaterelay.appleid.com");
      const displayEmail = isAppleRelay ? `<span style="color:#A89080;font-style:italic">Private relay</span>` : (u.email ?? "—");
      const proTag = u.is_pro
        ? `<span style="background:#3D6B3E;color:#C8F0C8;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600">PRO</span>`
        : `<span style="background:#3D2410;color:#A89080;padding:2px 10px;border-radius:100px;font-size:11px">free</span>`;
      return `<tr>
        <td style="padding:12px 16px;color:#A89080;font-size:13px">${u.id}</td>
        <td style="padding:12px 16px;font-size:14px">${displayEmail}</td>
        <td style="padding:12px 16px;font-size:13px;color:#A89080;font-family:monospace;font-size:11px">${u.apple_user_id ? u.apple_user_id.slice(0, 20) + "…" : "—"}</td>
        <td style="padding:12px 16px">${proTag}</td>
        <td style="padding:12px 16px;color:#A89080;text-align:right">${u.uses_this_month}</td>
        <td style="padding:12px 16px;color:#A89080;white-space:nowrap">${fmt(u.created_at)}</td>
      </tr>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Dial In — Admin</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,"DM Sans",system-ui,sans-serif;background:#1A100A;color:#FAF7F2;min-height:100vh}
    header{padding:24px 32px;border-bottom:1px solid #3D2410;display:flex;align-items:center;justify-content:space-between}
    .wordmark{font-family:Georgia,serif;font-style:italic;font-size:15px;color:#8B6347}
    .wordmark strong{color:#FAF7F2;font-style:normal}
    .refresh{font-size:12px;color:#6B5040}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;padding:28px 32px}
    .stat{background:#2C1A0E;border-radius:16px;padding:20px 24px}
    .stat-val{font-family:Georgia,serif;font-size:40px;color:#FAF7F2;line-height:1}
    .stat-label{font-size:12px;color:#8B6347;margin-top:8px;text-transform:uppercase;letter-spacing:.06em}
    .section{padding:0 32px 32px}
    h2{font-family:Georgia,serif;font-size:18px;font-weight:500;color:#FAF7F2;margin-bottom:16px}
    .table-wrap{border-radius:16px;overflow:hidden;border:1px solid #3D2410}
    table{width:100%;border-collapse:collapse;background:#2C1A0E}
    thead{background:#3D2410}
    th{padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#8B6347;text-transform:uppercase;letter-spacing:.06em}
    th:last-child{text-align:right}
    tr+tr{border-top:1px solid #3D2410}
    tr:hover td{background:#321c0f}
    .empty{padding:40px;text-align:center;color:#6B5040}
  </style>
  <meta http-equiv="refresh" content="60"/>
</head>
<body>
  <header>
    <div class="wordmark"><strong>Dial In</strong> — Admin</div>
    <span class="refresh">Auto-refreshes every 60 s</span>
  </header>

  <div class="stats">
    <div class="stat">
      <div class="stat-val">${stats["total_users"] ?? 0}</div>
      <div class="stat-label">Total users</div>
    </div>
    <div class="stat">
      <div class="stat-val">${stats["today_users"] ?? 0}</div>
      <div class="stat-label">Signed up today</div>
    </div>
    <div class="stat">
      <div class="stat-val">${stats["pro_users"] ?? 0}</div>
      <div class="stat-label">Pro subscribers</div>
    </div>
    <div class="stat">
      <div class="stat-val">${brews["today_brews"] ?? 0}</div>
      <div class="stat-label">Brews today</div>
    </div>
  </div>

  <div class="section">
    <h2>Recent sign-ups <span style="font-family:system-ui;font-size:13px;color:#6B5040;font-weight:400">(last 200)</span></h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Email</th>
            <th>Apple ID</th>
            <th>Plan</th>
            <th style="text-align:right">Brews this month</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : `<tr><td colspan="6" class="empty">No users yet</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    logger.error({ err }, "admin dashboard error");
    res.status(500).send("Internal error — check server logs.");
  }
});

// ── Affiliates ─────────────────────────────────────────────────────────────────

router.get("/admin/affiliates", async (req, res) => {
  try {
    const affiliates = await db
      .select({
        id: affiliatesTable.id,
        userId: affiliatesTable.userId,
        email: usersTable.email,
        referralCode: usersTable.referralCode,
        tier: affiliatesTable.tier,
        audienceSize: affiliatesTable.audienceSize,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        isActive: affiliatesTable.isActive,
        notes: affiliatesTable.notes,
        platinumAchievedAt: affiliatesTable.platinumAchievedAt,
        founderOutreachPending: affiliatesTable.founderOutreachPending,
        createdAt: affiliatesTable.createdAt,
      })
      .from(affiliatesTable)
      .innerJoin(usersTable, eq(affiliatesTable.userId, usersTable.id))
      .orderBy(desc(affiliatesTable.createdAt));

    const summaries = await Promise.all(
      affiliates.map(async (a) => {
        const [totals] = await db
          .select({
            totalEarnedCents: sql<number>`coalesce(sum(amount_cents),0)::int`,
            paidCents: sql<number>`coalesce(sum(case when status='paid' then amount_cents else 0 end),0)::int`,
            pendingCents: sql<number>`coalesce(sum(case when status='pending' then amount_cents else 0 end),0)::int`,
            conversionCount: sql<number>`count(distinct conversion_id)::int`,
          })
          .from(commissionLedgerTable)
          .where(eq(commissionLedgerTable.affiliateUserId, a.userId));

        return { ...a, ...totals };
      }),
    );

    res.json(summaries);
  } catch (err) {
    logger.error({ err }, "admin/affiliates list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/affiliates", async (req, res) => {
  const {
    email,
    userId: rawUserId,
    tier = "standard",
    audienceSize,
    payoutEmail,
    payoutMethod = "paypal",
    notes,
  } = req.body as {
    email?: string;
    userId?: number;
    tier?: string;
    audienceSize?: number;
    payoutEmail?: string;
    payoutMethod?: string;
    notes?: string;
  };

  if (!payoutEmail) {
    res.status(400).json({ error: "payoutEmail required" });
    return;
  }

  try {
    let userId = rawUserId;
    if (!userId && email) {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, email),
      });
      if (!user) {
        res.status(404).json({ error: "user not found" });
        return;
      }
      userId = user.id;
    }
    if (!userId) {
      res.status(400).json({ error: "email or userId required" });
      return;
    }

    const existing = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, userId),
    });
    if (existing) {
      res.status(409).json({ error: "affiliate already exists", id: existing.id });
      return;
    }

    const [affiliate] = await db
      .insert(affiliatesTable)
      .values({ userId, tier, audienceSize, payoutEmail, payoutMethod, notes })
      .returning();

    res.status(201).json(affiliate);
  } catch (err) {
    logger.error({ err }, "admin/affiliates create error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/admin/affiliates/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [affiliate] = await db
      .select({
        id: affiliatesTable.id,
        userId: affiliatesTable.userId,
        email: usersTable.email,
        referralCode: usersTable.referralCode,
        tier: affiliatesTable.tier,
        audienceSize: affiliatesTable.audienceSize,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        isActive: affiliatesTable.isActive,
        notes: affiliatesTable.notes,
        platinumAchievedAt: affiliatesTable.platinumAchievedAt,
        founderOutreachPending: affiliatesTable.founderOutreachPending,
        createdAt: affiliatesTable.createdAt,
      })
      .from(affiliatesTable)
      .innerJoin(usersTable, eq(affiliatesTable.userId, usersTable.id))
      .where(eq(affiliatesTable.id, id));

    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const conversions = await db
      .select()
      .from(referralConversionsTable)
      .where(eq(referralConversionsTable.referrerUserId, affiliate.userId))
      .orderBy(desc(referralConversionsTable.signedUpAt));

    const ledger = await db
      .select()
      .from(commissionLedgerTable)
      .where(eq(commissionLedgerTable.affiliateUserId, affiliate.userId))
      .orderBy(desc(commissionLedgerTable.createdAt));

    res.json({ ...affiliate, conversions, ledger });
  } catch (err) {
    logger.error({ err }, "admin/affiliates get error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/admin/affiliates/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const {
    tier,
    audienceSize,
    payoutEmail,
    payoutMethod,
    isActive,
    notes,
    customMonthlyRateCents,
    customAnnualRateCents,
    customLifetimeRateCents,
  } = req.body as {
    tier?: string;
    audienceSize?: number;
    payoutEmail?: string;
    payoutMethod?: string;
    isActive?: boolean;
    notes?: string;
    customMonthlyRateCents?: number | null;
    customAnnualRateCents?: number | null;
    customLifetimeRateCents?: number | null;
  };

  try {
    const updates: Partial<typeof affiliatesTable.$inferInsert> = {};
    if (tier !== undefined) updates.tier = tier;
    if (audienceSize !== undefined) updates.audienceSize = audienceSize;
    if (payoutEmail !== undefined) updates.payoutEmail = payoutEmail;
    if (payoutMethod !== undefined) updates.payoutMethod = payoutMethod;
    if (isActive !== undefined) updates.isActive = isActive;
    if (notes !== undefined) updates.notes = notes;
    if (customMonthlyRateCents !== undefined) updates.customMonthlyRateCents = customMonthlyRateCents;
    if (customAnnualRateCents !== undefined) updates.customAnnualRateCents = customAnnualRateCents;
    if (customLifetimeRateCents !== undefined) updates.customLifetimeRateCents = customLifetimeRateCents;

    const [updated] = await db
      .update(affiliatesTable)
      .set(updates)
      .where(eq(affiliatesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/affiliates update error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Set custom commission rates for one affiliate.
 * Pass null for a plan type to remove the override and fall back to the tier rate.
 * Example: { "monthlyRateCents": 125, "annualRateCents": null, "lifetimeRateCents": null }
 */
router.post("/admin/affiliates/:id/set-rates", async (req, res) => {
  const id = Number(req.params["id"]);
  const { monthlyRateCents, annualRateCents, lifetimeRateCents } = req.body as {
    monthlyRateCents?: number | null;
    annualRateCents?: number | null;
    lifetimeRateCents?: number | null;
  };

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const updates: Partial<typeof affiliatesTable.$inferInsert> = {};
    if (monthlyRateCents !== undefined) updates.customMonthlyRateCents = monthlyRateCents;
    if (annualRateCents !== undefined) updates.customAnnualRateCents = annualRateCents;
    if (lifetimeRateCents !== undefined) updates.customLifetimeRateCents = lifetimeRateCents;

    const [updated] = await db
      .update(affiliatesTable)
      .set(updates)
      .where(eq(affiliatesTable.id, id))
      .returning();

    const globalRates = await getCurrentRates();
    const resolveOrNull = (planType: string) => {
      try {
        return resolveRateCents(updated, planType, globalRates);
      } catch (e) {
        if (e instanceof MissingCommissionRateError) return null;
        throw e;
      }
    };
    res.json({
      affiliate: updated,
      effectiveRates: {
        monthly: resolveOrNull("monthly"),
        annual: resolveOrNull("annual"),
        lifetime: resolveOrNull("lifetime"),
      },
    });
  } catch (err) {
    logger.error({ err }, "admin/affiliates set-rates error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/affiliates/:id/set-code", async (req, res) => {
  const id = Number(req.params["id"]);
  const { code } = req.body as { code?: string };

  if (!code || !/^[A-Z0-9]{3,20}$/.test(code)) {
    res
      .status(400)
      .json({ error: "code must be 3-20 uppercase alphanumeric characters" });
    return;
  }

  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const conflict = await db.query.usersTable.findFirst({
      where: eq(usersTable.referralCode, code),
    });
    if (conflict && conflict.id !== affiliate.userId) {
      res.status(409).json({ error: "code_already_in_use" });
      return;
    }

    await db
      .update(usersTable)
      .set({ referralCode: code })
      .where(eq(usersTable.id, affiliate.userId));

    res.json({ code });
  } catch (err) {
    logger.error({ err }, "admin/affiliates set-code error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Manually recompute an affiliate's tier from their current active referred
 * subscriber count. Tiers are auto-promoted whenever a referral converts, so
 * this is mainly a backfill/debug tool — safe to call any time, it never
 * demotes and no-ops if the affiliate is already at or above the tier their
 * current count would earn them.
 */
router.post("/admin/affiliates/:id/recompute-tier", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, id),
    });
    if (!affiliate) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const result = await promoteAffiliateTierIfEligible(affiliate.userId);
    const updated = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.id, id),
    });

    res.json({ ...result, affiliate: updated });
  } catch (err) {
    logger.error({ err }, "admin/affiliates recompute-tier error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Clear the founder_outreach_pending flag once someone has personally
 * reached out to a newly-Platinum affiliate. platinum_achieved_at is never
 * cleared — it's a permanent record of when they first crossed the threshold.
 */
router.post("/admin/affiliates/:id/clear-outreach-flag", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [updated] = await db
      .update(affiliatesTable)
      .set({ founderOutreachPending: false })
      .where(eq(affiliatesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/affiliates clear-outreach-flag error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Conversions ────────────────────────────────────────────────────────────────

router.get("/admin/conversions", async (req, res) => {
  try {
    const conversions = await db
      .select()
      .from(referralConversionsTable)
      .orderBy(desc(referralConversionsTable.signedUpAt));
    res.json(conversions);
  } catch (err) {
    logger.error({ err }, "admin/conversions list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/conversions/:id/subscribe", async (req, res) => {
  const id = Number(req.params["id"]);
  const { planType, stripeSubscriptionId } = req.body as {
    planType?: string;
    stripeSubscriptionId?: string;
  };

  if (!planType || !["monthly", "annual", "lifetime"].includes(planType)) {
    res.status(400).json({ error: "planType must be monthly|annual|lifetime" });
    return;
  }

  try {
    const conversion = await db.query.referralConversionsTable.findFirst({
      where: eq(referralConversionsTable.id, id),
    });
    if (!conversion) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (conversion.isSubscriptionActive) {
      res.status(409).json({ error: "already_subscribed" });
      return;
    }

    const affiliate = await db.query.affiliatesTable.findFirst({
      where: eq(affiliatesTable.userId, conversion.referrerUserId),
    });
    if (!affiliate) {
      res.status(400).json({ error: "referrer is not a registered affiliate" });
      return;
    }

    const now = new Date();
    const periodMonth = currentMonth();

    // payableAfter = 30 days after subscription — protects against refund fraud
    const payableAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── Pre-flight: validate rates BEFORE any DB write ────────────────────────
    // assertRateWillExistForConversion is read-only (counts subscribers,
    // checks commission_phases). If it throws MissingCommissionRateError we
    // return 422 with zero committed state — no tier changes, no platinum flags,
    // no conversion row — so the admin can configure the rate and safely retry.
    const rates = await getCurrentRates();
    await assertRateWillExistForConversion(affiliate, planType, rates, 1);

    // ── Rate config confirmed — now commit state ───────────────────────────────
    // Recompute tier first — this conversion isn't marked active in the DB yet,
    // so pass extraActiveCount=1 to count it toward the promotion check.
    // On promotion, the affiliate's locked rate is refreshed to the new tier's
    // current rate; otherwise lock at the current tier rate on first-ever
    // subscription — guarantees they always earn at the rate they were
    // promised, regardless of future phase step-downs.
    const promotion = await promoteAffiliateTierIfEligible(affiliate.userId, 1);
    const lockedAffiliate = promotion.promoted
      ? (await db.query.affiliatesTable.findFirst({ where: eq(affiliatesTable.id, affiliate.id) }))!
      : await ensureRatesLocked(affiliate, rates, { requiredPlanTypes: [planType] });

    const amountCents = planType === "annual" || planType === "lifetime"
      ? resolveRateCents(lockedAffiliate, planType, rates)
      : null;

    await db
      .update(referralConversionsTable)
      .set({
        planType,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
        isSubscriptionActive: true,
        subscribedAt: now,
        payableAfter,
      })
      .where(eq(referralConversionsTable.id, id));

    // For annual and lifetime: generate a one-time commission immediately
    let ledgerEntry = null;
    if ((planType === "annual" || planType === "lifetime") && amountCents !== null && amountCents > 0) {
      const [entry] = await db
        .insert(commissionLedgerTable)
        .values({
          affiliateUserId: affiliate.userId,
          conversionId: id,
          periodMonth,
          planType,
          commissionType: "one_time",
          amountCents,
          tier: affiliate.tier,
          status: "pending",
        })
        .returning();
      ledgerEntry = entry;
    }

    res.json({
      conversion: { ...conversion, planType, isSubscriptionActive: true },
      ledgerEntry,
    });
  } catch (err) {
    if (err instanceof MissingCommissionRateError) {
      logger.error(
        { err, conversionId: id },
        "ADMIN ALERT: Cannot record subscription — no active commission_phases rate for this affiliate's (tier, planType). Configure the rate then retry.",
      );
      res.status(422).json({ error: "missing_commission_rate", detail: err.message });
      return;
    }
    logger.error({ err }, "admin/conversions subscribe error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/conversions/:id/cancel", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [updated] = await db
      .update(referralConversionsTable)
      .set({ isSubscriptionActive: false, cancelledAt: new Date() })
      .where(eq(referralConversionsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/conversions cancel error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Payouts ────────────────────────────────────────────────────────────────────

router.get("/admin/payouts", async (req, res) => {
  try {
    const batches = await db
      .select()
      .from(payoutBatchesTable)
      .orderBy(desc(payoutBatchesTable.createdAt));
    res.json(batches);
  } catch (err) {
    logger.error({ err }, "admin/payouts list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/payouts/generate", async (req, res) => {
  // Default to the PREVIOUS month so that running this job at end-of-month M
  // automatically covers month M-1 commissions, enforcing the 1-month delay.
  const { periodMonth = previousMonth(), notes } = req.body as {
    periodMonth?: string;
    notes?: string;
  };

  if (!/^\d{4}-\d{2}$/.test(periodMonth)) {
    res.status(400).json({ error: "periodMonth must be YYYY-MM" });
    return;
  }

  try {
    // Check for existing non-draft batch
    const existing = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.periodMonth, periodMonth),
    });
    if (existing && existing.status !== "draft") {
      res.status(409).json({
        error: "batch_already_exists",
        status: existing.status,
        id: existing.id,
      });
      return;
    }

    const rates = await getCurrentRates();

    // Find all active monthly referral conversions (include custom rate columns)
    const activeMonthly = await db
      .select({
        conversionId: referralConversionsTable.id,
        referrerUserId: referralConversionsTable.referrerUserId,
        affiliateId: affiliatesTable.id,
        tier: affiliatesTable.tier,
        customMonthlyRateCents: affiliatesTable.customMonthlyRateCents,
        customAnnualRateCents: affiliatesTable.customAnnualRateCents,
        customLifetimeRateCents: affiliatesTable.customLifetimeRateCents,
        affiliatePayoutEmail: affiliatesTable.payoutEmail,
        affiliatePayoutMethod: affiliatesTable.payoutMethod,
      })
      .from(referralConversionsTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, referralConversionsTable.referrerUserId),
      )
      .where(
        and(
          eq(referralConversionsTable.planType, "monthly"),
          eq(referralConversionsTable.isSubscriptionActive, true),
          eq(affiliatesTable.isActive, true),
          // Only include conversions that have passed the 30-day hold
          or(
            isNull(referralConversionsTable.payableAfter),
            lte(referralConversionsTable.payableAfter, sql`NOW()`),
          ),
        ),
      );

    // Find already-created ledger entries for this month to avoid duplicates
    const existingEntries = await db
      .select({ conversionId: commissionLedgerTable.conversionId })
      .from(commissionLedgerTable)
      .where(
        and(
          eq(commissionLedgerTable.periodMonth, periodMonth),
          eq(commissionLedgerTable.commissionType, "recurring"),
        ),
      );
    const existingConversionIds = new Set(
      existingEntries.map((e) => e.conversionId),
    );

    // Create ledger entries for any that don't have one yet
    const newEntries = activeMonthly.filter(
      (c) => !existingConversionIds.has(c.conversionId),
    );

    const skippedEntries: { conversionId: number; affiliateUserId: number; tier: string; reason: string }[] = [];
    let newEntriesInserted = 0;

    if (newEntries.length > 0) {
      // Self-healing tier check: recompute each affiliate's tier from their
      // current active referred subscriber count before locking rates for
      // this batch, in case anything changed outside the normal
      // webhook/admin-subscribe flow.
      const uniqueAffiliateUserIds = [...new Set(newEntries.map((c) => c.referrerUserId))];
      await Promise.all(uniqueAffiliateUserIds.map((uid) => promoteAffiliateTierIfEligible(uid)));

      // Lock rates for any affiliate who hasn't had a subscription event yet
      // (edge case: monthly subscriber added without going through /subscribe).
      // Guard: if commission_phases has no active row for the affiliate's (tier, planType),
      // skip the entry and emit a prominent error log rather than inserting a $0 ledger row.
      const resolvedEntries = await Promise.all(
        newEntries.map(async (c) => {
          try {
            const fresh = await db.query.affiliatesTable.findFirst({
              where: eq(affiliatesTable.id, c.affiliateId),
            });
            const affiliateForLock = fresh ?? {
              id: c.affiliateId,
              tier: c.tier,
              customMonthlyRateCents: c.customMonthlyRateCents,
              customAnnualRateCents: c.customAnnualRateCents,
              customLifetimeRateCents: c.customLifetimeRateCents,
            };
            const locked = await ensureRatesLocked(affiliateForLock, rates, { requiredPlanTypes: ["monthly"] });
            const amountCents = resolveRateCents(locked, "monthly", rates);
            return { ok: true as const, entry: { ...c, locked, amountCents } };
          } catch (err) {
            if (err instanceof MissingCommissionRateError) {
              logger.error(
                { conversionId: c.conversionId, affiliateUserId: c.referrerUserId, tier: c.tier, err },
                "ADMIN ALERT: Payout batch skipped ledger entry — no active commission_phases rate for this (tier, planType). Fix the rate configuration and regenerate the batch.",
              );
              return {
                ok: false as const,
                skipped: { conversionId: c.conversionId, affiliateUserId: c.referrerUserId, tier: c.tier, reason: err.message },
              };
            }
            throw err;
          }
        }),
      );

      for (const result of resolvedEntries) {
        if (!result.ok) skippedEntries.push(result.skipped);
      }

      const goodEntries = resolvedEntries.flatMap((r) => (r.ok ? [r.entry] : []));
      if (goodEntries.length > 0) {
        await db.insert(commissionLedgerTable).values(
          goodEntries.map(({ locked, conversionId, referrerUserId, amountCents }) => ({
            affiliateUserId: referrerUserId,
            conversionId,
            periodMonth,
            planType: "monthly",
            commissionType: "recurring",
            amountCents,
            tier: locked.tier,
            status: "pending",
          })),
        );
      }
      newEntriesInserted = goodEntries.length;
    }

    // Also include any previously created but unpaid entries for this period
    const allPeriodEntries = await db
      .select({
        id: commissionLedgerTable.id,
        affiliateUserId: commissionLedgerTable.affiliateUserId,
        conversionId: commissionLedgerTable.conversionId,
        periodMonth: commissionLedgerTable.periodMonth,
        planType: commissionLedgerTable.planType,
        commissionType: commissionLedgerTable.commissionType,
        amountCents: commissionLedgerTable.amountCents,
        tier: commissionLedgerTable.tier,
        status: commissionLedgerTable.status,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        affiliateEmail: usersTable.email,
      })
      .from(commissionLedgerTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, commissionLedgerTable.affiliateUserId),
      )
      .innerJoin(
        usersTable,
        eq(usersTable.id, commissionLedgerTable.affiliateUserId),
      )
      .where(
        and(
          eq(commissionLedgerTable.periodMonth, periodMonth),
          eq(commissionLedgerTable.status, "pending"),
        ),
      );

    const totalAmountCents = allPeriodEntries.reduce(
      (sum, e) => sum + e.amountCents,
      0,
    );
    const uniqueAffiliates = new Set(
      allPeriodEntries.map((e) => e.affiliateUserId),
    );

    // Create or update the draft batch
    const processableAfter = calcProcessableAfter(periodMonth);
    let batch;
    if (existing) {
      const [updated] = await db
        .update(payoutBatchesTable)
        .set({
          totalAmountCents,
          affiliateCount: uniqueAffiliates.size,
          skippedCount: skippedEntries.length,
          notes: notes ?? existing.notes,
          processableAfter,
        })
        .where(eq(payoutBatchesTable.id, existing.id))
        .returning();
      batch = updated;
    } else {
      const [created] = await db
        .insert(payoutBatchesTable)
        .values({
          periodMonth,
          totalAmountCents,
          affiliateCount: uniqueAffiliates.size,
          skippedCount: skippedEntries.length,
          notes,
          processableAfter,
        })
        .returning();
      batch = created;
    }

    // Link ledger entries to the batch
    if (allPeriodEntries.length > 0) {
      await db
        .update(commissionLedgerTable)
        .set({ payoutBatchId: batch.id })
        .where(
          and(
            eq(commissionLedgerTable.periodMonth, periodMonth),
            eq(commissionLedgerTable.status, "pending"),
          ),
        );
    }

    if (skippedEntries.length > 0) {
      logger.error(
        { periodMonth, skippedCount: skippedEntries.length, skippedEntries },
        "ADMIN ALERT: Payout batch generated with skipped entries due to missing commission rates — these affiliates will NOT be paid until rates are configured and the batch is regenerated.",
      );
      sendPayoutSkipAlert({
        periodMonth,
        batchId: batch.id,
        skippedEntries,
      }).catch((err) => {
        logger.error({ err }, "payout skip alert email threw unexpectedly");
      });
    }

    res.json({
      batch,
      lineItems: allPeriodEntries,
      newEntriesCreated: newEntriesInserted,
      skippedEntries,
    });
  } catch (err) {
    logger.error({ err }, "admin/payouts generate error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/admin/payouts/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const lineItems = await db
      .select({
        ledgerId: commissionLedgerTable.id,
        affiliateUserId: commissionLedgerTable.affiliateUserId,
        affiliateEmail: usersTable.email,
        payoutEmail: affiliatesTable.payoutEmail,
        payoutMethod: affiliatesTable.payoutMethod,
        tier: commissionLedgerTable.tier,
        conversionId: commissionLedgerTable.conversionId,
        periodMonth: commissionLedgerTable.periodMonth,
        planType: commissionLedgerTable.planType,
        commissionType: commissionLedgerTable.commissionType,
        amountCents: commissionLedgerTable.amountCents,
        amountDollars: sql<string>`(amount_cents / 100.0)::numeric(10,2)`,
        status: commissionLedgerTable.status,
      })
      .from(commissionLedgerTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, commissionLedgerTable.affiliateUserId),
      )
      .innerJoin(
        usersTable,
        eq(usersTable.id, commissionLedgerTable.affiliateUserId),
      )
      .where(eq(commissionLedgerTable.payoutBatchId, id))
      .orderBy(affiliatesTable.payoutEmail);

    // Aggregate by affiliate for the payout summary
    const byAffiliate: Record<
      string,
      { payoutEmail: string; payoutMethod: string; totalCents: number; entries: typeof lineItems }
    > = {};
    for (const item of lineItems) {
      const key = item.payoutEmail;
      if (!byAffiliate[key]) {
        byAffiliate[key] = {
          payoutEmail: item.payoutEmail,
          payoutMethod: item.payoutMethod,
          totalCents: 0,
          entries: [],
        };
      }
      byAffiliate[key].totalCents += item.amountCents;
      byAffiliate[key].entries.push(item);
    }

    res.json({
      batch,
      lineItems,
      payoutSummary: Object.values(byAffiliate).map((a) => ({
        payoutEmail: a.payoutEmail,
        payoutMethod: a.payoutMethod,
        totalCents: a.totalCents,
        totalDollars: (a.totalCents / 100).toFixed(2),
        entryCount: a.entries.length,
      })),
    });
  } catch (err) {
    logger.error({ err }, "admin/payouts get error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/payouts/:id/approve", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (batch.status !== "draft") {
      res.status(409).json({ error: "batch_not_in_draft", status: batch.status });
      return;
    }

    // Guard: if the batch has skipped entries (missing commission rates),
    // block approval until the admin explicitly acknowledges the gap by
    // passing { force: true } in the request body. This prevents silently
    // approving an incomplete batch without noticing that some affiliates
    // were excluded.
    if (batch.skippedCount > 0 && !req.body?.force) {
      res.status(409).json({
        error: "batch_has_skipped_entries",
        skippedCount: batch.skippedCount,
        message: `This batch skipped ${batch.skippedCount} affiliate(s) due to missing commission rates. Fix the rates and regenerate, or pass { force: true } to approve the incomplete batch anyway.`,
      });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(payoutBatchesTable)
      .set({ status: "approved", approvedAt: now })
      .where(eq(payoutBatchesTable.id, id))
      .returning();

    await db
      .update(commissionLedgerTable)
      .set({ status: "approved" })
      .where(
        and(
          eq(commissionLedgerTable.payoutBatchId, id),
          eq(commissionLedgerTable.status, "pending"),
        ),
      );

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/payouts approve error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/admin/payouts/:id/process
 *
 * Executes real Stripe Connect transfers for every approved ledger entry in a
 * batch. Entries are grouped by affiliate; one transfer is created per affiliate
 * (to minimise Stripe fees).
 *
 * Affiliates without a completed Connect account are skipped and left in
 * "approved" status — call /complete afterward to mark the batch done after
 * handling those manually.
 *
 * Idempotent: entries already in "paid" status are ignored.
 */
router.post("/admin/payouts/:id/process", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const stripe = getStripe();

    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (batch.status !== "approved") {
      res.status(409).json({ error: "batch_must_be_approved_first", status: batch.status });
      return;
    }

    // Enforce 1-month delay: commissions earned in month M cannot be paid
    // until the last day of month M+1 to ensure funds are always in hand.
    if (batch.processableAfter) {
      const today = new Date().toISOString().split("T")[0]!;
      if (today < batch.processableAfter) {
        res.status(409).json({
          error: "too_early",
          message: `This batch covers ${batch.periodMonth} commissions and cannot be processed before ${batch.processableAfter}.`,
          processableAfter: batch.processableAfter,
        });
        return;
      }
    }

    // Load approved ledger entries with affiliate Connect + compliance details
    const entries = await db
      .select({
        ledgerId: commissionLedgerTable.id,
        affiliateUserId: commissionLedgerTable.affiliateUserId,
        amountCents: commissionLedgerTable.amountCents,
        stripeConnectAccountId: affiliatesTable.stripeConnectAccountId,
        connectOnboardingComplete: affiliatesTable.connectOnboardingComplete,
        taxFormComplete: affiliatesTable.taxFormComplete,
        ftcDisclosureAccepted: affiliatesTable.ftcDisclosureAccepted,
        gdprConsent: affiliatesTable.gdprConsent,
        withholdTax: affiliatesTable.withholdTax,
        withholdTaxRatePct: affiliatesTable.withholdTaxRatePct,
        country: affiliatesTable.country,
        dac7Reportable: affiliatesTable.dac7Reportable,
        totalPaidYtdCents: affiliatesTable.totalPaidYtdCents,
      })
      .from(commissionLedgerTable)
      .innerJoin(
        affiliatesTable,
        eq(affiliatesTable.userId, commissionLedgerTable.affiliateUserId),
      )
      .where(
        and(
          eq(commissionLedgerTable.payoutBatchId, id),
          eq(commissionLedgerTable.status, "approved"),
        ),
      );

    // Group by affiliate user ID
    const byAffiliate = new Map<
      number,
      {
        stripeConnectAccountId: string | null;
        connectOnboardingComplete: boolean;
        taxFormComplete: boolean;
        ftcDisclosureAccepted: boolean;
        gdprConsent: boolean;
        withholdTax: boolean;
        withholdTaxRatePct: number;
        country: string | null;
        dac7Reportable: boolean;
        totalPaidYtdCents: number;
        ledgerIds: number[];
        totalCents: number;
      }
    >();

    for (const e of entries) {
      const cur = byAffiliate.get(e.affiliateUserId) ?? {
        stripeConnectAccountId: e.stripeConnectAccountId,
        connectOnboardingComplete: e.connectOnboardingComplete,
        taxFormComplete: e.taxFormComplete,
        ftcDisclosureAccepted: e.ftcDisclosureAccepted,
        gdprConsent: e.gdprConsent,
        withholdTax: e.withholdTax,
        withholdTaxRatePct: e.withholdTaxRatePct,
        country: e.country,
        dac7Reportable: e.dac7Reportable,
        totalPaidYtdCents: e.totalPaidYtdCents,
        ledgerIds: [],
        totalCents: 0,
      };
      cur.ledgerIds.push(e.ledgerId);
      cur.totalCents += e.amountCents;
      byAffiliate.set(e.affiliateUserId, cur);
    }

    const results: {
      affiliateUserId: number;
      status:
        | "transferred"
        | "skipped_no_connect"
        | "skipped_incomplete"
        | "skipped_compliance"
        | "failed";
      transferId?: string;
      grossCents?: number;
      withheldCents?: number;
      netCents?: number;
      error?: string;
    }[] = [];

    const now = new Date();
    // $600 threshold for 1099-NEC requirement (in cents)
    const THRESHOLD_1099_CENTS = 60_000;

    for (const [affiliateUserId, group] of byAffiliate) {
      const country = (group.country ?? "US").toUpperCase();

      // Compliance gate.
      //
      // Tax compliance: satisfied by EITHER:
      //   a) connectOnboardingComplete — Stripe collected W-9/W-8BEN, bank
      //      details, and handles 1099-NEC. This is the preferred path for
      //      Stage 2+ affiliates (30+ people).
      //   b) taxFormComplete — manual W-9/W-8BEN form submitted via our API.
      //      Used for Stage 1 PayPal affiliates before Stripe Connect is live.
      //
      // FTC disclosure and GDPR consent are always our responsibility —
      // Stripe never collects these.
      //
      // AU withholding: applied independently of the tax compliance gate.
      // For Connect users Stripe collects the W-8BEN, but does not apply
      // ATO withholding — that obligation stays with us. Affiliates who have
      // not submitted a manual form with an ABN retain withholdTax=true.
      const taxOk = group.connectOnboardingComplete || group.taxFormComplete;
      const needsGdpr = isEuMemberState(country) || country === "GB";
      const complianceOk =
        taxOk &&
        group.ftcDisclosureAccepted &&
        (!needsGdpr || group.gdprConsent);

      if (!complianceOk) {
        results.push({ affiliateUserId, status: "skipped_compliance" });
        continue;
      }
      if (!group.stripeConnectAccountId) {
        results.push({ affiliateUserId, status: "skipped_no_connect" });
        continue;
      }
      if (!group.connectOnboardingComplete) {
        results.push({ affiliateUserId, status: "skipped_incomplete" });
        continue;
      }

      // Apply withholding (AU without ABN → 47%; all others → 0%)
      const withheldCents = group.withholdTax
        ? Math.floor(group.totalCents * (group.withholdTaxRatePct / 100))
        : 0;
      const netCents = group.totalCents - withheldCents;

      try {
        const transfer = await stripe.transfers.create({
          amount: netCents,
          currency: "usd",
          destination: group.stripeConnectAccountId,
          metadata: {
            batchId: String(id),
            affiliateUserId: String(affiliateUserId),
            periodMonth: batch.periodMonth,
            grossCents: String(group.totalCents),
            withheldCents: String(withheldCents),
            withholdingRatePct: String(group.withholdTaxRatePct),
          },
        });

        const newYtd = group.totalPaidYtdCents + group.totalCents;
        const eurEquivCents = usdCentsToEurCents(group.totalCents);

        await db
          .update(commissionLedgerTable)
          .set({ status: "paid", stripeTransferId: transfer.id, paidAt: now })
          .where(inArray(commissionLedgerTable.id, group.ledgerIds));

        // Track YTD, 1099 threshold, and DAC7 EUR-equivalent earnings
        await db
          .update(affiliatesTable)
          .set({
            totalPaidYtdCents: sql`total_paid_ytd_cents + ${group.totalCents}`,
            requires1099: newYtd >= THRESHOLD_1099_CENTS,
            ...(group.dac7Reportable && {
              totalEarnedEurEquivCents: sql`total_earned_eur_equiv_cents + ${eurEquivCents}`,
            }),
          })
          .where(eq(affiliatesTable.userId, affiliateUserId));

        results.push({
          affiliateUserId,
          status: "transferred",
          transferId: transfer.id,
          grossCents: group.totalCents,
          withheldCents,
          netCents,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, affiliateUserId, batchId: id }, "stripe transfer failed");
        results.push({ affiliateUserId, status: "failed", error: message });
      }
    }

    // Mark batch completed if all entries are now paid
    const remainingApproved = await db.query.commissionLedgerTable.findFirst({
      where: and(
        eq(commissionLedgerTable.payoutBatchId, id),
        eq(commissionLedgerTable.status, "approved"),
      ),
    });

    let updatedBatch = batch;
    if (!remainingApproved) {
      const [b] = await db
        .update(payoutBatchesTable)
        .set({ status: "completed", completedAt: now })
        .where(eq(payoutBatchesTable.id, id))
        .returning();
      updatedBatch = b;
    }

    logger.info({ batchId: id, results }, "payout batch processed");
    res.json({ batch: updatedBatch, results });
  } catch (err) {
    logger.error({ err }, "admin/payouts process error");
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/admin/payouts/:id/complete
 *
 * Manually marks any remaining approved entries as paid and closes the batch.
 * Use this after handling non-Connect affiliates out-of-band (bank transfer, etc).
 */
router.post("/admin/payouts/:id/complete", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const batch = await db.query.payoutBatchesTable.findFirst({
      where: eq(payoutBatchesTable.id, id),
    });
    if (!batch) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (batch.status !== "approved") {
      res.status(409).json({ error: "batch_must_be_approved_first", status: batch.status });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(payoutBatchesTable)
      .set({ status: "completed", completedAt: now })
      .where(eq(payoutBatchesTable.id, id))
      .returning();

    await db
      .update(commissionLedgerTable)
      .set({ status: "paid", paidAt: now })
      .where(
        and(
          eq(commissionLedgerTable.payoutBatchId, id),
          eq(commissionLedgerTable.status, "approved"),
        ),
      );

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/payouts complete error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Rates ──────────────────────────────────────────────────────────────────────

router.get("/admin/rates", async (req, res) => {
  try {
    const phases = await db
      .select()
      .from(commissionPhasesTable)
      .orderBy(commissionPhasesTable.phaseNumber, commissionPhasesTable.tier);

    // Serve HTML for browser navigation, JSON for API clients
    const acceptsHtml = req.headers["accept"]?.includes("text/html");
    if (!acceptsHtml) {
      res.json(phases);
      return;
    }

    // Group phases by phaseName (ordered by phaseNumber)
    const phaseGroups = new Map<string, { phaseNumber: number; phaseName: string; rows: typeof phases }>();
    for (const p of phases) {
      const key = `${p.phaseNumber}:${p.phaseName}`;
      if (!phaseGroups.has(key)) {
        phaseGroups.set(key, { phaseNumber: p.phaseNumber, phaseName: p.phaseName, rows: [] });
      }
      phaseGroups.get(key)!.rows.push(p);
    }

    const TIER_ORDER = ["standard", "silver", "gold", "platinum"];
    const PLAN_ORDER = ["monthly", "annual", "lifetime"];

    const fmtDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const fmtDate = (d: string | null | undefined) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    };
    const fmtTs = (d: Date | null | undefined) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
    };

    const triggerLabel = (p: (typeof phases)[0]) => {
      if (p.triggerType === "manual") return "Manual";
      if (p.triggerType === "date") return `Date: ${fmtDate(p.scheduledFor)}`;
      if (p.triggerType === "subscriber_count") return `${(p.triggerValue ?? 0).toLocaleString()} subscribers`;
      if (p.triggerType === "gross_revenue") return `$${((p.triggerValue ?? 0) / 100).toLocaleString()} revenue`;
      return p.triggerType;
    };

    const groupSections = [...phaseGroups.values()]
      .sort((a, b) => a.phaseNumber - b.phaseNumber)
      .map(({ phaseNumber, phaseName, rows }) => {
        const allActive = rows.every(r => r.isActive);
        const anyActive = rows.some(r => r.isActive);
        const phaseStatus = allActive
          ? `<span class="badge badge-active">active</span>`
          : anyActive
            ? `<span class="badge badge-partial">partial</span>`
            : `<span class="badge badge-inactive">inactive</span>`;

        const tableRows = [...rows]
          .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || PLAN_ORDER.indexOf(a.planType) - PLAN_ORDER.indexOf(b.planType))
          .map(p => {
            const activateBtn = p.isActive
              ? `<span style="color:#6B5040;font-size:12px">Active since ${fmtTs(p.activatedAt)}</span>`
              : `<button class="btn-activate" onclick="activatePhase(${p.id}, this)">Activate</button>`;
            return `<tr id="row-${p.id}">
              <td><span class="tier-badge tier-${p.tier}">${p.tier}</span></td>
              <td>${p.planType}</td>
              <td style="font-family:monospace;font-size:14px">${fmtDollars(p.amountCents)}</td>
              <td style="font-size:12px;color:#A89080">${triggerLabel(p)}</td>
              <td>${p.isActive
                ? `<span class="badge badge-active">active</span>`
                : `<span class="badge badge-inactive" id="badge-${p.id}">inactive</span>`}</td>
              <td>${activateBtn}</td>
              <td style="font-size:12px;color:#6B5040;max-width:200px">${p.notes ?? "—"}</td>
            </tr>`;
          }).join("");

        return `
        <div class="phase-group">
          <div class="phase-header">
            <div>
              <span class="phase-num">Phase ${phaseNumber}</span>
              <span class="phase-name">${phaseName}</span>
            </div>
            ${phaseStatus}
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Plan</th>
                  <th>Rate</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>${tableRows || `<tr><td colspan="7" class="empty">No rows in this phase</td></tr>`}</tbody>
            </table>
          </div>
        </div>`;
      }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Dial In — Commission Rates</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,"DM Sans",system-ui,sans-serif;background:#1A100A;color:#FAF7F2;min-height:100vh}
    header{padding:20px 32px;border-bottom:1px solid #3D2410;display:flex;align-items:center;gap:24px}
    .wordmark{font-family:Georgia,serif;font-style:italic;font-size:15px;color:#8B6347}
    .wordmark strong{color:#FAF7F2;font-style:normal}
    nav a{font-size:13px;color:#8B6347;text-decoration:none}
    nav a:hover{color:#FAF7F2}
    .content{padding:28px 32px;max-width:1100px}
    h1{font-family:Georgia,serif;font-size:22px;font-weight:500;margin-bottom:6px}
    .subtitle{font-size:13px;color:#6B5040;margin-bottom:28px}
    .phase-group{margin-bottom:32px}
    .phase-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .phase-num{font-size:11px;font-weight:600;color:#8B6347;text-transform:uppercase;letter-spacing:.06em;margin-right:10px}
    .phase-name{font-family:Georgia,serif;font-size:17px;color:#FAF7F2}
    .table-wrap{border-radius:12px;overflow:hidden;border:1px solid #3D2410}
    table{width:100%;border-collapse:collapse;background:#2C1A0E}
    thead{background:#3D2410}
    th{padding:9px 14px;text-align:left;font-size:11px;font-weight:600;color:#8B6347;text-transform:uppercase;letter-spacing:.06em}
    td{padding:11px 14px;border-top:1px solid #3D2410;vertical-align:middle}
    tr:hover td{background:#321c0f}
    .empty{padding:24px;text-align:center;color:#6B5040;font-size:13px}
    .badge{display:inline-block;padding:2px 9px;border-radius:100px;font-size:11px;font-weight:600}
    .badge-active{background:#1e4d22;color:#86efac}
    .badge-inactive{background:#3D2410;color:#8B6347}
    .badge-partial{background:#3d3510;color:#d4a93a}
    .tier-badge{display:inline-block;padding:2px 9px;border-radius:6px;font-size:12px;font-weight:600;text-transform:capitalize}
    .tier-standard{background:#2C2C3A;color:#9BA3AF}
    .tier-silver{background:#2A3040;color:#93C5FD}
    .tier-gold{background:#3D2F10;color:#FCD34D}
    .tier-platinum{background:#2A1A40;color:#C4B5FD}
    .btn-activate{background:#2C4A2E;color:#86efac;border:1px solid #3a6b3d;padding:4px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600}
    .btn-activate:hover{background:#3a6b3d}
    .btn-activate:disabled{opacity:.5;cursor:default}

    /* Add phase form */
    .form-section{margin-top:44px;padding-top:32px;border-top:1px solid #3D2410}
    .form-section h2{font-family:Georgia,serif;font-size:18px;font-weight:500;margin-bottom:6px}
    .form-section .sub{font-size:13px;color:#6B5040;margin-bottom:24px}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
    .form-full{grid-column:1/-1}
    label{display:block;font-size:12px;font-weight:600;color:#8B6347;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
    input,select,textarea{width:100%;background:#2C1A0E;border:1px solid #3D2410;color:#FAF7F2;border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#6B5040}
    select option{background:#2C1A0E}
    textarea{min-height:64px;resize:vertical}
    .hint{font-size:11px;color:#6B5040;margin-top:4px}
    .trigger-extras{display:none;margin-top:12px}
    .trigger-extras.visible{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .btn-submit{margin-top:24px;background:#8B6347;color:#FAF7F2;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    .btn-submit:hover{background:#a07355}
    .btn-submit:disabled{opacity:.5;cursor:default}
    #form-msg{margin-top:16px;padding:12px 16px;border-radius:8px;font-size:13px;display:none}
    #form-msg.success{background:#1e4d22;color:#86efac;border:1px solid #3a6b3d}
    #form-msg.error{background:#4d1e1e;color:#fca5a5;border:1px solid #6b3a3a}

    #activate-msg{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;display:none;z-index:100}
    #activate-msg.success{background:#1e4d22;color:#86efac;border:1px solid #3a6b3d}
    #activate-msg.error{background:#4d1e1e;color:#fca5a5;border:1px solid #6b3a3a}
  </style>
</head>
<body>
  <header>
    <div class="wordmark"><strong>Dial In</strong> — Admin</div>
    <nav>
      <a href="/api/admin">← Dashboard</a>
    </nav>
  </header>

  <div class="content">
    <h1>Commission Rates</h1>
    <p class="subtitle">All commission phases — grouped by phase name. Activating a row makes it the effective rate for that tier + plan combination.</p>

    ${phaseGroups.size === 0
      ? `<div style="padding:48px;text-align:center;color:#6B5040;border:1px solid #3D2410;border-radius:12px">No commission phases configured yet. Add one below.</div>`
      : groupSections
    }

    <!-- ── Add Phase Row Form ──────────────────────────────────────────── -->
    <div class="form-section">
      <h2>Add Phase Row</h2>
      <p class="sub">Add a new row to an existing or new phase. Each row covers one tier + plan combination. A complete phase has 12 rows (4 tiers × 3 plans).</p>

      <div class="form-grid">
        <div>
          <label for="f-phaseName">Phase Name</label>
          <input id="f-phaseName" placeholder="e.g. Growth" />
          <div class="hint">Human name for the phase group</div>
        </div>
        <div>
          <label for="f-phaseNumber">Phase Number</label>
          <input id="f-phaseNumber" type="number" min="1" placeholder="2" />
          <div class="hint">Groups rows visually; higher = newer</div>
        </div>
        <div>
          <label for="f-tier">Tier</label>
          <select id="f-tier">
            <option value="standard">Standard</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>
        <div>
          <label for="f-planType">Plan</label>
          <select id="f-planType">
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>
        <div>
          <label for="f-amountDollars">Rate (USD)</label>
          <input id="f-amountDollars" type="number" min="0.01" step="0.01" placeholder="1.00" />
          <div class="hint">Per-conversion commission in dollars</div>
        </div>
        <div>
          <label for="f-triggerType">Trigger Type</label>
          <select id="f-triggerType" onchange="onTriggerChange()">
            <option value="manual">Manual (activate by hand)</option>
            <option value="date">Scheduled date</option>
            <option value="subscriber_count">Subscriber count threshold</option>
            <option value="gross_revenue">Gross revenue threshold</option>
          </select>
        </div>

        <div class="trigger-extras form-full" id="trigger-extras">
          <div id="te-date" style="display:none">
            <label for="f-scheduledFor">Activate on date</label>
            <input id="f-scheduledFor" type="date" />
          </div>
          <div id="te-value" style="display:none">
            <label for="f-triggerValue" id="tv-label">Threshold value</label>
            <input id="f-triggerValue" type="number" min="1" />
            <div class="hint" id="tv-hint"></div>
          </div>
        </div>

        <div class="form-full">
          <label for="f-notes">Notes (optional)</label>
          <textarea id="f-notes" placeholder="Why this phase was added, who approved it, etc."></textarea>
        </div>
      </div>

      <button class="btn-submit" id="btn-add" onclick="addPhaseRow()">Add Row</button>
      <div id="form-msg"></div>
    </div>
  </div>

  <div id="activate-msg"></div>

  <script>
    function onTriggerChange() {
      var t = document.getElementById('f-triggerType').value;
      var extras = document.getElementById('trigger-extras');
      var teDate = document.getElementById('te-date');
      var teVal = document.getElementById('te-value');
      var tvLabel = document.getElementById('tv-label');
      var tvHint = document.getElementById('tv-hint');

      extras.classList.toggle('visible', t !== 'manual');
      teDate.style.display = t === 'date' ? '' : 'none';
      teVal.style.display = (t === 'subscriber_count' || t === 'gross_revenue') ? '' : 'none';

      if (t === 'subscriber_count') {
        tvLabel.textContent = 'Subscriber count threshold';
        tvHint.textContent = 'Activate when active paid subscriber count reaches this number';
      } else if (t === 'gross_revenue') {
        tvLabel.textContent = 'Gross revenue threshold (cents)';
        tvHint.textContent = 'Activate when cumulative gross revenue (in cents) reaches this amount';
      }
    }

    async function activatePhase(id, btn) {
      btn.disabled = true;
      btn.textContent = 'Activating…';
      var msg = document.getElementById('activate-msg');
      try {
        var resp = await fetch('/api/admin/rates/' + id + '/activate', {
          method: 'POST',
          credentials: 'include',
        });
        if (!resp.ok) {
          var err = await resp.json().catch(function(){ return { error: resp.statusText }; });
          throw new Error(err.error || resp.statusText);
        }
        // Update row in place
        var badge = document.getElementById('badge-' + id);
        if (badge) {
          badge.className = 'badge badge-active';
          badge.textContent = 'active';
        }
        btn.replaceWith(Object.assign(document.createElement('span'), {
          style: 'color:#6B5040;font-size:12px',
          textContent: 'Activated just now'
        }));
        msg.className = 'success';
        msg.textContent = '✓ Phase row activated';
        msg.style.display = 'block';
        setTimeout(function(){ msg.style.display = 'none'; }, 3000);
      } catch(e) {
        btn.disabled = false;
        btn.textContent = 'Activate';
        msg.className = 'error';
        msg.textContent = 'Error: ' + e.message;
        msg.style.display = 'block';
        setTimeout(function(){ msg.style.display = 'none'; }, 5000);
      }
    }

    async function addPhaseRow() {
      var phaseName = document.getElementById('f-phaseName').value.trim();
      var phaseNumber = parseInt(document.getElementById('f-phaseNumber').value, 10);
      var tier = document.getElementById('f-tier').value;
      var planType = document.getElementById('f-planType').value;
      var amountDollars = parseFloat(document.getElementById('f-amountDollars').value);
      var triggerType = document.getElementById('f-triggerType').value;
      var scheduledFor = document.getElementById('f-scheduledFor').value || undefined;
      var triggerValueRaw = document.getElementById('f-triggerValue').value;
      var triggerValue = triggerValueRaw ? parseInt(triggerValueRaw, 10) : undefined;
      var notes = document.getElementById('f-notes').value.trim() || undefined;

      var msg = document.getElementById('form-msg');
      msg.style.display = 'none';

      if (!phaseName || isNaN(phaseNumber) || !tier || !planType || isNaN(amountDollars) || amountDollars <= 0) {
        msg.className = 'error';
        msg.textContent = 'Phase name, phase number, tier, plan, and a positive rate are required.';
        msg.style.display = 'block';
        return;
      }

      var btn = document.getElementById('btn-add');
      btn.disabled = true;
      btn.textContent = 'Adding…';

      try {
        var resp = await fetch('/api/admin/rates/phase', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phaseName,
            phaseNumber,
            tier,
            planType,
            amountCents: Math.round(amountDollars * 100),
            triggerType,
            triggerValue,
            scheduledFor,
            notes,
          }),
        });
        var data = await resp.json();
        if (!resp.ok) throw new Error(data.error || resp.statusText);

        msg.className = 'success';
        msg.textContent = '✓ Phase row added (ID ' + data.id + '). Refresh the page to see it in the table.';
        msg.style.display = 'block';

        // Clear fields
        document.getElementById('f-phaseName').value = '';
        document.getElementById('f-phaseNumber').value = '';
        document.getElementById('f-amountDollars').value = '';
        document.getElementById('f-notes').value = '';
        document.getElementById('f-scheduledFor').value = '';
        document.getElementById('f-triggerValue').value = '';
        document.getElementById('f-triggerType').value = 'manual';
        onTriggerChange();
      } catch(e) {
        msg.className = 'error';
        msg.textContent = 'Error: ' + e.message;
        msg.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Add Row';
      }
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    logger.error({ err }, "admin/rates list error");
    const acceptsHtml = req.headers["accept"]?.includes("text/html");
    if (acceptsHtml) {
      res.status(500).send("Internal error — check server logs.");
    } else {
      res.status(500).json({ error: "internal_error" });
    }
  }
});

router.get("/admin/rates/current", async (req, res) => {
  try {
    const rates = await getCurrentRates();
    res.json(rates);
  } catch (err) {
    logger.error({ err }, "admin/rates current error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/rates/phase", async (req, res) => {
  const {
    phaseName,
    phaseNumber,
    tier,
    planType,
    amountCents,
    triggerType = "manual",
    triggerValue,
    scheduledFor,
    notes,
  } = req.body as {
    phaseName: string;
    phaseNumber: number;
    tier: string;
    planType: string;
    amountCents: number;
    triggerType?: string;
    triggerValue?: number;
    scheduledFor?: string;
    notes?: string;
  };

  if (!phaseName || !tier || !planType || !amountCents || !phaseNumber) {
    res
      .status(400)
      .json({ error: "phaseName, phaseNumber, tier, planType, amountCents required" });
    return;
  }

  const validTiers = ["standard", "silver", "gold", "platinum"];
  const validPlans = ["monthly", "annual", "lifetime"];
  const validTriggers = ["manual", "date", "subscriber_count", "gross_revenue"];

  if (!validTiers.includes(tier) || !validPlans.includes(planType)) {
    res.status(400).json({ error: "invalid tier or planType" });
    return;
  }
  if (!validTriggers.includes(triggerType)) {
    res.status(400).json({ error: "invalid triggerType" });
    return;
  }

  try {
    const [phase] = await db
      .insert(commissionPhasesTable)
      .values({
        phaseName,
        phaseNumber,
        tier,
        planType,
        amountCents,
        triggerType,
        triggerValue: triggerValue ?? null,
        scheduledFor: scheduledFor ?? null,
        notes,
        isActive: false,
      })
      .returning();

    res.status(201).json(phase);
  } catch (err) {
    logger.error({ err }, "admin/rates phase error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/rates/check-triggers", async (req, res) => {
  /**
   * Check all inactive phases and activate any whose trigger condition has been met.
   * Provide current totals for subscriber_count and gross_revenue checks.
   *
   * Body (optional):
   *   activePaidSubscribers  — current active paid subscriber count
   *   grossRevenueCents      — cumulative gross revenue in cents
   */
  const { activePaidSubscribers = 0, grossRevenueCents = 0 } = req.body as {
    activePaidSubscribers?: number;
    grossRevenueCents?: number;
  };

  try {
    const inactivePhases = await db
      .select()
      .from(commissionPhasesTable)
      .where(eq(commissionPhasesTable.isActive, false));

    const now = new Date();
    const today = now.toISOString().split("T")[0]!;
    const activated: typeof inactivePhases = [];

    for (const phase of inactivePhases) {
      let shouldActivate = false;

      if (phase.triggerType === "date" && phase.scheduledFor) {
        shouldActivate = phase.scheduledFor <= today;
      } else if (
        phase.triggerType === "subscriber_count" &&
        phase.triggerValue !== null
      ) {
        shouldActivate = activePaidSubscribers >= phase.triggerValue;
      } else if (
        phase.triggerType === "gross_revenue" &&
        phase.triggerValue !== null
      ) {
        shouldActivate = grossRevenueCents >= phase.triggerValue;
      }
      // manual — never auto-activates here

      if (shouldActivate) {
        await db
          .update(commissionPhasesTable)
          .set({ isActive: true, activatedAt: now })
          .where(eq(commissionPhasesTable.id, phase.id));
        activated.push({ ...phase, isActive: true, activatedAt: now });
      }
    }

    res.json({
      checked: inactivePhases.length,
      activated: activated.length,
      activatedPhases: activated,
    });
  } catch (err) {
    logger.error({ err }, "admin/rates check-triggers error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/rates/:id/activate", async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const [updated] = await db
      .update(commissionPhasesTable)
      .set({ isActive: true, activatedAt: new Date() })
      .where(eq(commissionPhasesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/rates activate error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Gear catalogue admin ────────────────────────────────────────────────────────

const GEAR_FORM_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dial In — Gear Catalogue Admin</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #FAF7F2; color: #2C1A0E; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  p.sub { color: #666; margin-top: 0; font-size: 0.9rem; }
  label { display: block; font-weight: 600; margin-top: 16px; font-size: 0.875rem; }
  input, textarea, select { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.95rem; margin-top: 4px; background: #fff; }
  textarea { min-height: 80px; resize: vertical; }
  .hint { font-size: 0.8rem; color: #888; margin-top: 3px; }
  button { margin-top: 24px; background: #2C1A0E; color: #FAF7F2; border: none; padding: 12px 28px; border-radius: 8px; font-size: 1rem; cursor: pointer; }
  button:hover { background: #4a2e14; }
  button:disabled { background: #999; cursor: not-allowed; }
  .btn-ai { background: #5b3a29; }
  .btn-ai:hover { background: #7a4f38; }
  .btn-sm { padding: 6px 14px; font-size: 0.85rem; margin-top: 0; }
  .btn-edit { background: none; border: 1px solid #2C1A0E; color: #2C1A0E; padding: 3px 10px; border-radius: 5px; font-size: 0.78rem; cursor: pointer; margin-right: 4px; margin-top: 0; }
  .btn-edit:hover { background: #2C1A0E; color: #FAF7F2; }
  .btn-toggle { border: none; padding: 3px 10px; border-radius: 5px; font-size: 0.78rem; cursor: pointer; margin-top: 0; }
  .btn-toggle-active { background: #f8d7da; color: #721c24; }
  .btn-toggle-active:hover { background: #f5c6cb; }
  .btn-toggle-inactive { background: #d4edda; color: #155724; }
  .btn-toggle-inactive:hover { background: #c3e6cb; }
  .btn-toggle:disabled { opacity: 0.5; cursor: default; }
  .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; color: #155724; }
  .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; color: #721c24; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.85rem; }
  th { text-align: left; padding: 8px 10px; background: #2C1A0E; color: #FAF7F2; }
  td { padding: 8px 10px; border-bottom: 1px solid #e0d8cf; vertical-align: middle; }
  tr:hover td { background: #f0ebe3; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .badge-active { background: #d4edda; color: #155724; }
  .badge-inactive { background: #f8d7da; color: #721c24; }
  .section { margin-top: 48px; border-top: 2px solid #2C1A0E; padding-top: 24px; }
  #generate-status { margin-top: 16px; padding: 12px 16px; border-radius: 6px; background: #fff3cd; border: 1px solid #ffc107; color: #856404; display: none; }
  #preview-section { display: none; margin-top: 24px; }
  #preview-table-wrap { max-height: 420px; overflow-y: auto; border: 1px solid #ccc; border-radius: 6px; }
  #preview-table-wrap table { margin-top: 0; }
  .asin-link { font-size: 0.8rem; color: #5b3a29; }
  .methods-cell { font-size: 0.75rem; color: #666; }
  #form-section { scroll-margin-top: 20px; }
  .editing-banner { background: #fff3cd; border: 1px solid #ffc107; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9rem; display: none; }
  .editing-banner.visible { display: block; }
</style>
</head>
<body>
<h1>☕ Gear Catalogue Admin</h1>
<p class="sub">Add or update products. Protected — keep this URL private.</p>

{{MESSAGE}}

<!-- ── AI Catalogue Generator ──────────────────────────────────────────── -->
<div class="section">
<h2 style="font-size:1.1rem;margin-bottom:4px">🤖 Generate Catalogue with AI</h2>
<p class="sub">GPT generates 12 real coffee gear products with Amazon search links. Run it multiple times to build up your catalogue — nothing is saved until you click Import.</p>

<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px">
  <label style="margin:0;font-weight:600;font-size:0.875rem">Focus area (optional)</label>
  <select id="gen-focus" style="width:auto;margin:0;font-size:0.9rem">
    <option value="all">All brew methods (broadest catalogue)</option>
    <option value="espresso">Espresso only</option>
    <option value="pour_over">Pour-over / V60 / Chemex</option>
    <option value="aeropress">AeroPress</option>
    <option value="french_press">French Press</option>
    <option value="cold_brew">Cold Brew</option>
  </select>
  <button class="btn-ai" id="btn-generate" onclick="runGenerate()" style="margin-top:0">Generate Products</button>
</div>

<div id="generate-status"></div>

<div id="preview-section">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <strong id="preview-count"></strong>
    <div style="display:flex;gap:8px">
      <button class="btn-ai btn-sm" onclick="selectAll(true)" style="margin-top:0">Select all</button>
      <button class="btn-sm" onclick="selectAll(false)" style="background:#888;margin-top:0">Deselect all</button>
      <button class="btn-sm" id="btn-import" onclick="importSelected()" style="background:#155724;margin-top:0">Import selected →</button>
    </div>
  </div>
  <div id="preview-table-wrap"></div>
  <p class="hint" style="margin-top:8px">Click <strong>Search ↗</strong> to verify each product exists on Amazon before importing. Links land on the Amazon search results for that product — your affiliate tag is added automatically when users click through from the app.</p>
</div>
</div>

<script>
let generatedProducts = [];

async function runGenerate() {
  const focus = document.getElementById('gen-focus').value;
  const btn = document.getElementById('btn-generate');
  const status = document.getElementById('generate-status');
  const preview = document.getElementById('preview-section');

  btn.disabled = true;
  btn.textContent = 'Generating…';
  status.style.display = 'block';
  status.textContent = 'Asking AI to generate coffee gear suggestions — this takes ~15 seconds…';
  preview.style.display = 'none';

  try {
    const resp = await fetch('/api/admin/gear/generate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focus }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || resp.statusText);
    }
    const data = await resp.json();
    generatedProducts = data.products;
    renderPreview(generatedProducts);
    status.style.display = 'none';
    preview.style.display = 'block';
  } catch (e) {
    status.style.background = '#f8d7da';
    status.style.borderColor = '#f5c6cb';
    status.style.color = '#721c24';
    status.textContent = 'Error: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Products';
  }
}

function renderPreview(products) {
  document.getElementById('preview-count').textContent = products.length + ' products generated — select which to import:';
  const rows = products.map((p, i) => {
    const methods = p.brewMethods.join(', ');
    return \`<tr>
      <td><input type="checkbox" id="chk-\${i}" checked></td>
      <td><strong>\${escHtml(p.name)}</strong><br><span class="methods-cell">\${escHtml(methods)}</span></td>
      <td>\${escHtml(p.priceLabel)}</td>
      <td>\${escHtml(p.experienceLevel)}</td>
      <td><a class="asin-link" href="\${escHtml(p.amazonUrl)}" target="_blank">Search ↗</a></td>
    </tr>\`;
  }).join('');
  document.getElementById('preview-table-wrap').innerHTML =
    '<table><thead><tr><th style="width:32px"></th><th>Product</th><th>Price</th><th>Level</th><th>Amazon</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function selectAll(checked) {
  generatedProducts.forEach((_, i) => {
    const chk = document.getElementById('chk-' + i);
    if (chk) chk.checked = checked;
  });
}

async function importSelected() {
  const selected = generatedProducts.filter((_, i) => {
    const chk = document.getElementById('chk-' + i);
    return chk && chk.checked;
  });
  if (selected.length === 0) { alert('Select at least one product.'); return; }

  const btn = document.getElementById('btn-import');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  try {
    const resp = await fetch('/api/admin/gear/import', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || resp.statusText);
    alert('✓ Imported ' + data.upserted + ' products successfully! Reloading page…');
    location.reload();
  } catch (e) {
    alert('Import failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import selected →';
  }
}
</script>

<!-- ── Manual Add / Update ─────────────────────────────────────────────── -->
<div class="section" id="form-section">
<h2 style="font-size:1.1rem;margin-bottom:4px">Add / Update Product</h2>
<p class="sub">Existing slugs are updated; new slugs are created.</p>
<div class="editing-banner" id="editing-banner">✏️ Editing <strong id="editing-slug-label"></strong> — <a href="#" onclick="clearForm();return false;">clear form</a></div>
<form method="POST" action="/api/admin/gear" id="gear-form">
  <label>Slug (URL-safe, e.g. <code>acaia-lunar</code>)</label>
  <input name="slug" id="f-slug" required placeholder="acaia-lunar" pattern="[a-z0-9-]+" title="lowercase letters, numbers, hyphens only">

  <label>Product Name</label>
  <input name="name" id="f-name" required placeholder="Acaia Lunar Espresso Scale">

  <label>Amazon URL (without affiliate tag)</label>
  <input name="amazonUrl" id="f-amazonUrl" required placeholder="https://www.amazon.com/dp/B07BMPKJVN" type="url">

  <label>Price Label</label>
  <input name="priceLabel" id="f-priceLabel" required placeholder="~$200">

  <label>Brew Methods</label>
  <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:8px">
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="espresso" class="bm"> Espresso</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="general" class="bm"> General (any)</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="pour_over" class="bm"> Pour-over</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="v60" class="bm"> V60</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="chemex" class="bm"> Chemex</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="kalita" class="bm"> Kalita</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="aeropress" class="bm"> AeroPress</label>
    <label style="font-weight:normal;display:flex;align-items:center;gap:4px;margin-top:0"><input type="checkbox" name="brewMethods" value="french_press" class="bm"> French Press</label>
  </div>

  <label>Experience Level</label>
  <select name="experienceLevel" id="f-experienceLevel">
    <option value="beginner">Beginner (0–9 brews or missing basic data)</option>
    <option value="intermediate">Intermediate (10+ brews, tracking well)</option>
    <option value="advanced">Advanced (30+ brews, no gaps)</option>
  </select>
  <div class="hint">Beginner products show to everyone; intermediate to 10+ brew users; advanced to 30+ brew users.</div>

  <label>Description Hint (for AI — explain when to recommend this)</label>
  <textarea name="descriptionHint" id="f-descriptionHint" required placeholder="Essential for espresso users not logging dose in grams. Accurate to 0.1g, fits under low-clearance machines."></textarea>
  <div class="hint">This is not shown to users — it guides the AI on when and how to pitch this product.</div>

  <label style="display:flex;align-items:center;gap:8px;margin-top:16px;font-weight:normal">
    <input type="checkbox" name="active" id="f-active" value="true" checked style="width:auto">
    Active (visible to users)
  </label>

  <button type="submit">Save Product</button>
</form>
</div>

<div class="section">
<h2 style="font-size:1.1rem;margin-bottom:16px">Current Catalogue</h2>
{{TABLE}}
</div>

<script>
var PRODUCTS = {{PRODUCTS_JSON}};

function editProduct(slug) {
  var p = PRODUCTS.find(function(x){ return x.slug === slug; });
  if (!p) return;
  document.getElementById('f-slug').value = p.slug;
  document.getElementById('f-name').value = p.name;
  document.getElementById('f-amazonUrl').value = p.amazonUrl;
  document.getElementById('f-priceLabel').value = p.priceLabel;
  document.getElementById('f-descriptionHint').value = p.descriptionHint;
  document.getElementById('f-experienceLevel').value = p.experienceLevel;
  document.getElementById('f-active').checked = p.active;
  document.querySelectorAll('.bm').forEach(function(cb) {
    cb.checked = p.brewMethods.indexOf(cb.value) !== -1;
  });
  var banner = document.getElementById('editing-banner');
  document.getElementById('editing-slug-label').textContent = slug;
  banner.classList.add('visible');
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
}

function clearForm() {
  document.getElementById('gear-form').reset();
  document.getElementById('editing-banner').classList.remove('visible');
}

function toggleProduct(slug, makeActive) {
  var btn = document.getElementById('toggle-btn-' + slug);
  var badge = document.getElementById('badge-' + slug);
  btn.disabled = true;
  fetch('/api/admin/gear/' + encodeURIComponent(slug), {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: makeActive })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var isActive = data.active;
    badge.className = 'badge ' + (isActive ? 'badge-active' : 'badge-inactive');
    badge.textContent = isActive ? 'active' : 'inactive';
    btn.textContent = isActive ? 'Deactivate' : 'Activate';
    btn.className = 'btn-toggle ' + (isActive ? 'btn-toggle-active' : 'btn-toggle-inactive');
    btn.onclick = function(){ toggleProduct(slug, !isActive); };
    var prod = PRODUCTS.find(function(x){ return x.slug === slug; });
    if (prod) prod.active = isActive;
    btn.disabled = false;
  })
  .catch(function() {
    btn.disabled = false;
    alert('Toggle failed — check server logs.');
  });
}
</script>
</body>
</html>`;

type GearProductRow = {
  slug: string;
  name: string;
  amazonUrl: string;
  priceLabel: string;
  experienceLevel: string;
  brewMethods: string[];
  descriptionHint: string;
  active: boolean;
};

function buildProductTable(products: GearProductRow[]): string {
  if (products.length === 0) return "<p>No products yet.</p>";
  const rows = products
    .map(
      (p) => `<tr>
      <td>${p.slug}</td>
      <td>${p.name}</td>
      <td>${p.priceLabel}</td>
      <td>${p.experienceLevel}</td>
      <td>${p.brewMethods.join(", ")}</td>
      <td>
        <span class="badge ${p.active ? "badge-active" : "badge-inactive"}" id="badge-${p.slug}">${p.active ? "active" : "inactive"}</span>
      </td>
      <td>
        <button class="btn-edit" onclick="editProduct('${p.slug}')">Edit</button>
        <button
          id="toggle-btn-${p.slug}"
          class="btn-toggle ${p.active ? "btn-toggle-active" : "btn-toggle-inactive"}"
          onclick="toggleProduct('${p.slug}', ${!p.active})"
        >${p.active ? "Deactivate" : "Activate"}</button>
      </td>
    </tr>`,
    )
    .join("");
  return `<table>
    <thead><tr><th>Slug</th><th>Name</th><th>Price</th><th>Level</th><th>Methods</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

router.get("/admin/gear", async (req, res) => {
  try {
    const products = await db
      .select({
        slug: gearProductsTable.slug,
        name: gearProductsTable.name,
        amazonUrl: gearProductsTable.amazonUrl,
        priceLabel: gearProductsTable.priceLabel,
        experienceLevel: gearProductsTable.experienceLevel,
        brewMethods: gearProductsTable.brewMethods,
        descriptionHint: gearProductsTable.descriptionHint,
        active: gearProductsTable.active,
      })
      .from(gearProductsTable)
      .orderBy(gearProductsTable.createdAt);

    const html = GEAR_FORM_HTML
      .replace("{{MESSAGE}}", "")
      .replace("{{TABLE}}", buildProductTable(products))
      .replace("{{PRODUCTS_JSON}}", JSON.stringify(products));
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    logger.error({ err }, "admin/gear GET error");
    res.status(500).send("Internal error");
  }
});

router.post("/admin/gear", async (req, res) => {
  const body = req.body as Record<string, string | string[] | undefined>;
  const slug = (body["slug"] as string | undefined)?.trim().toLowerCase();
  const name = (body["name"] as string | undefined)?.trim();
  const amazonUrl = (body["amazonUrl"] as string | undefined)?.trim();
  const priceLabel = (body["priceLabel"] as string | undefined)?.trim();
  const descriptionHint = (body["descriptionHint"] as string | undefined)?.trim();
  const rawLevel = (body["experienceLevel"] as string | undefined) ?? "beginner";
  const experienceLevel = (GEAR_EXPERIENCE_LEVELS as readonly string[]).includes(rawLevel)
    ? rawLevel
    : "beginner";
  const active = body["active"] === "true";

  const rawMethods = body["brewMethods"];
  const brewMethods: string[] = Array.isArray(rawMethods)
    ? rawMethods
    : rawMethods
      ? [rawMethods]
      : [];

  let message = "";

  if (!slug || !name || !amazonUrl || !priceLabel || !descriptionHint || brewMethods.length === 0) {
    message = '<div class="error">All fields are required, and at least one brew method must be selected.</div>';
  } else {
    try {
      await db
        .insert(gearProductsTable)
        .values({ slug, name, amazonUrl, priceLabel, brewMethods, experienceLevel, descriptionHint, active })
        .onConflictDoUpdate({
          target: gearProductsTable.slug,
          set: { name, amazonUrl, priceLabel, brewMethods, experienceLevel, descriptionHint, active },
        });
      invalidateGearRecommendCache();
      message = `<div class="success">✓ Product "<strong>${name}</strong>" saved successfully.</div>`;
    } catch (err) {
      logger.error({ err }, "admin/gear POST error");
      message = '<div class="error">Database error — check server logs.</div>';
    }
  }

  const products = await db
    .select({
      slug: gearProductsTable.slug,
      name: gearProductsTable.name,
      amazonUrl: gearProductsTable.amazonUrl,
      priceLabel: gearProductsTable.priceLabel,
      experienceLevel: gearProductsTable.experienceLevel,
      brewMethods: gearProductsTable.brewMethods,
      descriptionHint: gearProductsTable.descriptionHint,
      active: gearProductsTable.active,
    })
    .from(gearProductsTable)
    .orderBy(gearProductsTable.createdAt)
    .catch(() => []);

  const html = GEAR_FORM_HTML
    .replace("{{MESSAGE}}", message)
    .replace("{{TABLE}}", buildProductTable(products))
    .replace("{{PRODUCTS_JSON}}", JSON.stringify(products));
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ── AI catalogue generator ─────────────────────────────────────────────────

const BREW_METHOD_LABELS: Record<string, string> = {
  all: "espresso, pour-over (V60, Chemex, Kalita), AeroPress, French press, Moka pot, cold brew, and general",
  espresso: "espresso only",
  pour_over: "pour-over methods (V60, Chemex, Kalita Wave)",
  aeropress: "AeroPress only",
  french_press: "French press only",
  cold_brew: "cold brew only",
};

interface GeneratedProduct {
  slug: string;
  name: string;
  amazonUrl: string;
  priceLabel: string;
  brewMethods: string[];
  experienceLevel: "beginner" | "intermediate" | "advanced";
  descriptionHint: string;
  active: boolean;
}

router.post("/admin/gear/generate", async (req, res) => {
  const focus = (req.body as { focus?: string }).focus ?? "all";
  const methodLabel = BREW_METHOD_LABELS[focus] ?? BREW_METHOD_LABELS["all"]!;

  // Fetch existing slugs so GPT can avoid duplicates
  const existingRows = await db
    .select({ slug: gearProductsTable.slug })
    .from(gearProductsTable)
    .catch(() => [] as { slug: string }[]);
  const existingSlugs = existingRows.map((r) => r.slug).join(", ") || "none";

  const systemPrompt = `You are a coffee gear expert producing a product catalogue for an AI espresso coaching app.
Return a JSON array of coffee equipment sold on Amazon. Use Amazon search URLs — do NOT fabricate ASINs.

Each object in the array must have EXACTLY these fields:
- name: full product name string (e.g. "Hario V60 Plastic Coffee Dripper")
- slug: unique, lowercase, hyphens only (e.g. "hario-v60-plastic"). No spaces or special chars.
- amazonUrl: Amazon search URL — "https://www.amazon.com/s?k=<URL-encoded+product+name>". Do NOT use /dp/ URLs.
- priceLabel: approximate retail price string like "~$79" or "~$1,200".
- brewMethods: array of strings from: espresso, general, pour_over, v60, chemex, kalita, aeropress, french_press, cold_brew, moka_pot. Use "general" for gear that benefits all brew styles.
- experienceLevel: exactly one of: "beginner", "intermediate", "advanced".
- descriptionHint: 1–2 sentence string for the AI system explaining when to recommend this product.
- active: true.

Do NOT include these already-catalogued slugs: ${existingSlugs}.
Return ONLY a valid JSON array. No markdown fences, no extra text, no commentary.`;

  const userPrompt = `Generate exactly 12 coffee gear products for ${methodLabel}.

Pick 12 distinct items from this spread:
- Grinders (hand and electric, budget to premium)
- Scales (general and espresso-specific)
- Kettles (gooseneck, variable temperature)
- Brewers/drippers (${focus === "all" ? "V60, Chemex, AeroPress, French press, Moka pot, cold brew" : methodLabel})
- Espresso accessories (tampers, distribution tools, puck screens) ${focus === "espresso" || focus === "all" ? "" : "— skip these"}
- Coffee storage (airtight canisters)
- Water quality (filters, TDS meters)

Spread experience levels: ~60% beginner, ~30% intermediate, ~10% advanced.
For each product include all brew methods it meaningfully serves.
Return EXACTLY 12 items — no more, no less.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    // Strip any accidental markdown fences
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let products: GeneratedProduct[];
    try {
      products = JSON.parse(json);
    } catch {
      logger.error({ raw }, "admin/gear/generate: GPT returned invalid JSON");
      res.status(502).json({ error: "AI returned invalid JSON — try again" });
      return;
    }

    if (!Array.isArray(products)) {
      res.status(502).json({ error: "AI response was not an array — try again" });
      return;
    }

    // Sanitise: enforce enum values, required fields, and ensure amazonUrl is a valid Amazon URL.
    // GPT occasionally uses alias field names (productName, product_name) — normalise them.
    const clean = products
      .map((p) => {
        // Normalise name field — GPT sometimes returns productName or product_name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = p as any;
        const name: string = String(raw.name ?? raw.productName ?? raw.product_name ?? "").trim();
        const slug: string = String(raw.slug ?? "").trim();
        const priceLabel: string = String(raw.priceLabel ?? raw.price_label ?? raw.price ?? "").trim();
        const descriptionHint: string = String(raw.descriptionHint ?? raw.description_hint ?? raw.description ?? "").trim();
        const rawUrl: string = String(raw.amazonUrl ?? raw.amazon_url ?? raw.url ?? "").trim();
        const brewMethods: string[] = Array.isArray(raw.brewMethods) ? raw.brewMethods
          : Array.isArray(raw.brew_methods) ? raw.brew_methods : [];

        // Build search URL — accept search URLs; convert any stale /dp/ URL; construct from name as fallback
        let amazonUrl = rawUrl;
        if (!amazonUrl || amazonUrl.includes("/dp/")) {
          amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(name || slug)}`;
        }

        return { name, slug, priceLabel, descriptionHint, amazonUrl, brewMethods,
          experienceLevel: raw.experienceLevel ?? raw.experience_level ?? "beginner" };
      })
      .filter((p) => {
        if (!p.slug || !p.name || !p.priceLabel || p.brewMethods.length === 0) return false;
        try { return new URL(p.amazonUrl).hostname.includes("amazon."); } catch { return false; }
      })
      .map((p) => ({
        slug: p.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
        name: p.name,
        amazonUrl: p.amazonUrl,
        priceLabel: p.priceLabel,
        brewMethods: p.brewMethods.filter(Boolean),
        experienceLevel: (["beginner", "intermediate", "advanced"] as const).includes(p.experienceLevel)
          ? p.experienceLevel as "beginner" | "intermediate" | "advanced"
          : "beginner" as const,
        descriptionHint: p.descriptionHint,
        active: true,
      }));

    logger.info({ count: clean.length, focus }, "admin/gear/generate: AI catalogue generated");
    res.json({ products: clean });
  } catch (err) {
    logger.error({ err }, "admin/gear/generate: OpenAI error");
    res.status(502).json({ error: "AI request failed — check server logs" });
  }
});

router.patch("/admin/gear/:slug", async (req, res) => {
  const slug = req.params["slug"];
  const body = req.body as Record<string, unknown>;

  const updates: { active?: boolean; priceLabel?: string; descriptionHint?: string } = {};

  if (typeof body["active"] === "boolean") {
    updates.active = body["active"];
  }
  if (typeof body["priceLabel"] === "string" && body["priceLabel"].trim()) {
    updates.priceLabel = body["priceLabel"].trim();
  }
  if (typeof body["descriptionHint"] === "string" && body["descriptionHint"].trim()) {
    updates.descriptionHint = body["descriptionHint"].trim();
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "no valid fields to update (allowed: active, priceLabel, descriptionHint)" });
    return;
  }

  try {
    const [updated] = await db
      .update(gearProductsTable)
      .set(updates)
      .where(eq(gearProductsTable.slug, slug))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    invalidateGearRecommendCache();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/gear PATCH error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/gear/import", async (req, res) => {
  const products = req.body as Array<{
    slug: string;
    name: string;
    amazonUrl: string;
    priceLabel: string;
    brewMethods: string[];
    experienceLevel?: string;
    descriptionHint: string;
    active?: boolean;
  }>;

  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: "body must be a non-empty array of products" });
    return;
  }

  try {
    const results = await Promise.all(
      products.map(async (p) => {
        const row = {
          slug: p.slug,
          name: p.name,
          amazonUrl: p.amazonUrl,
          priceLabel: p.priceLabel,
          brewMethods: p.brewMethods ?? [],
          experienceLevel: (GEAR_EXPERIENCE_LEVELS as readonly string[]).includes(p.experienceLevel ?? "")
            ? p.experienceLevel!
            : "beginner",
          descriptionHint: p.descriptionHint,
          active: p.active ?? true,
        };
        await db
          .insert(gearProductsTable)
          .values(row)
          .onConflictDoUpdate({ target: gearProductsTable.slug, set: row });
        return p.slug;
      }),
    );

    invalidateGearRecommendCache();
    res.json({ upserted: results.length, slugs: results });
  } catch (err) {
    logger.error({ err }, "admin/gear/import error");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── Promo codes ────────────────────────────────────────────────────────────────

router.get("/admin/promo-codes", async (_req, res) => {
  try {
    const codes = await db
      .select({
        id: promoCodesTable.id,
        code: promoCodesTable.code,
        rewardMonths: promoCodesTable.rewardMonths,
        maxUses: promoCodesTable.maxUses,
        useCount: promoCodesTable.useCount,
        active: promoCodesTable.active,
        expiresAt: promoCodesTable.expiresAt,
        createdAt: promoCodesTable.createdAt,
      })
      .from(promoCodesTable)
      .orderBy(desc(promoCodesTable.createdAt));
    res.json(codes);
  } catch (err) {
    logger.error({ err }, "admin/promo-codes list error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/admin/promo-codes", async (req, res) => {
  const { code, rewardMonths = 1, maxUses, expiresAt, active = true } = req.body as {
    code?: string;
    rewardMonths?: number;
    maxUses?: number | null;
    expiresAt?: string | null;
    active?: boolean;
  };

  if (!code) {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const normalized = code.trim().toUpperCase();

  try {
    const [created] = await db
      .insert(promoCodesTable)
      .values({
        code: normalized,
        rewardMonths,
        maxUses: maxUses ?? null,
        active,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      res.status(409).json({ error: "code already exists" });
      return;
    }

    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "admin/promo-codes create error");
    res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/admin/promo-codes/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const { active, maxUses, expiresAt } = req.body as {
    active?: boolean;
    maxUses?: number | null;
    expiresAt?: string | null;
  };

  try {
    const updates: Partial<typeof promoCodesTable.$inferInsert> = {};
    if (active !== undefined) updates.active = active;
    if (maxUses !== undefined) updates.maxUses = maxUses;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const [updated] = await db
      .update(promoCodesTable)
      .set(updates)
      .where(eq(promoCodesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "admin/promo-codes update error");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
