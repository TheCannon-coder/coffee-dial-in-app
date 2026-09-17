/**
 * Affiliate web portal — public explainer page + login-gated dashboard.
 *
 * Independent of REFERRAL_PROGRAM (which gates the in-app self-serve join).
 * The public page (lib/affiliate-become-page.ts) sends prospects to join in
 * the app; the dashboard serves existing, active affiliates.
 *
 * Routes:
 *   GET  /affiliate/become         — public SEO explainer page for prospects
 *   GET  /affiliate/login          — email-based login page
 *   POST /api/affiliate/login-request — sends a magic login link (Resend)
 *   GET  /affiliate/verify         — redeems the magic link, sets session cookie
 *   GET  /affiliate/dashboard      — gated dashboard, real data only
 *   POST /api/affiliate/logout     — clears the session cookie
 */

import { Router, type Request, type Response } from "express";
import { eq, and, desc, sql as dsql } from "drizzle-orm";
import {
  db,
  affiliatesTable,
  commissionLedgerTable,
  payoutBatchesTable,
} from "@workspace/db";
import { buildPage, injectAppRating } from "../lib/page-template.js";
import { getAppRating } from "../lib/app-rating.js";
import { renderAffiliateBecomePage } from "../lib/affiliate-become-page.js";
import { AFFILIATE_OG_PNG } from "../lib/affiliate-og-image.js";
import {
  createLoginToken,
  redeemLoginToken,
  setAffiliateSessionCookie,
  clearAffiliateSessionCookie,
  requireAffiliateAuth,
} from "../lib/affiliate-session.js";
import {
  countActiveReferredSubscribers,
  getCurrentRates,
  resolveRateCents,
  MissingCommissionRateError,
} from "../lib/affiliate-helpers.js";
import { logger } from "../lib/logger.js";

const router = Router();

const BASE = "https://www.coffeebrew.coach";

const TIER_LADDER = [
  { tier: "standard", label: "Standard", min: 0, rate: "$0.75/mo" },
  { tier: "silver", label: "Silver", min: 10, rate: "$1.00/mo" },
  { tier: "gold", label: "Gold", min: 100, rate: "$1.50/mo" },
  { tier: "platinum", label: "Platinum", min: 1000, rate: "$2.00/mo" },
] as const;

function tierIndex(tier: string): number {
  const idx = TIER_LADDER.findIndex(t => t.tier === tier);
  return idx === -1 ? 0 : idx;
}

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── GET /affiliate — redirect bare path to the explainer ─────────────────────

router.get("/affiliate", (_req, res) => {
  res.redirect(301, "/affiliate/become");
});

// ── GET /affiliate/become — public explainer page ────────────────────────────
// Rendered per request so the App Store rating badge/schema stay live.

router.get("/affiliate/become", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.send(injectAppRating(renderAffiliateBecomePage(), getAppRating()));
});

// ── GET /affiliate/og(.png) — share image. Must be PNG: social crawlers skip SVG.

const serveAffiliateOg = (_req: Request, res: Response): void => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(AFFILIATE_OG_PNG);
};
router.get("/affiliate/og.png", serveAffiliateOg);
router.get("/affiliate/og", serveAffiliateOg);

// ── GET /affiliate/login — magic-link login page ─────────────────────────────

router.get("/affiliate/login", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Affiliate Log In | Coffee Brew Coach</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, system-ui, sans-serif; background: #FAF7F2; color: #2C1A0E; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 20px; padding: 40px 36px; max-width: 420px; width: 100%; box-shadow: 0 10px 40px rgba(44,26,14,0.08); text-align: center; }
    .logo { width: 44px; height: 44px; border-radius: 12px; background: #2C1A0E; color: #FAF7F2; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 20px; }
    h1 { font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-style: italic; font-size: 26px; margin-bottom: 4px; }
    .sub { font-size: 13px; color: #8B6347; margin-bottom: 28px; }
    p.desc { font-size: 14px; color: #6B4226; margin-bottom: 22px; line-height: 1.6; }
    form { display: flex; flex-direction: column; gap: 10px; }
    input { border: 1.5px solid #E0D5C8; border-radius: 8px; padding: 13px 14px; font-size: 15px; font-family: inherit; outline: none; }
    input:focus { border-color: #8B6347; box-shadow: 0 0 0 3px rgba(139,99,71,0.12); }
    button { background: #2C1A0E; color: #FAF7F2; border: none; border-radius: 8px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
    button:hover { background: #3D2410; }
    button:disabled { opacity: 0.55; cursor: default; }
    .msg { font-size: 14px; margin-top: 18px; line-height: 1.55; }
    .msg.success { color: #1B6B3A; }
    .msg.error { color: #B91C1C; }
    .back { display: block; margin-top: 22px; font-size: 13px; color: #A89080; text-decoration: none; }
    .back:hover { color: #2C1A0E; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">☕</div>
    <h1>Partner Dashboard</h1>
    <p class="sub">Coffee Brew Coach</p>
    <p class="desc">Enter the email on file for your affiliate account and we'll send you a one-time login link. No password needed.</p>
    <form id="login-form" novalidate>
      <input type="email" name="email" placeholder="you@example.com" required autocomplete="email" />
      <button type="submit">Send login link</button>
    </form>
    <p class="msg" id="msg" hidden></p>
    <a class="back" href="/affiliate/become">&larr; Learn about the affiliate program</a>
  </div>
  <script>
  (function () {
    var form = document.getElementById("login-form");
    var msg = document.getElementById("msg");
    var btn = form.querySelector("button");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.querySelector("input").value.trim();
      if (!email) return;
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
      msg.hidden = true;
      fetch("/api/affiliate/login-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function () {
          form.hidden = true;
          msg.className = "msg success";
          msg.textContent = "If that email is on file as a confirmed affiliate, we've sent a login link \u2014 check your inbox. The link expires in 15 minutes.";
          msg.hidden = false;
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = "Send login link";
          msg.className = "msg error";
          msg.textContent = "Something went wrong. Please try again.";
          msg.hidden = false;
        });
    });
  })();
  </script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── POST /api/affiliate/login-request — send magic link ─────────────────────

router.post("/api/affiliate/login-request", async (req, res) => {
  const { email } = req.body as { email?: string };

  // Always respond generically — never confirm/deny whether an email is enrolled.
  const genericResponse = () => res.json({ ok: true });

  if (!email || !email.includes("@")) {
    genericResponse();
    return;
  }

  const normalised = email.toLowerCase().trim();

  const affiliate = await db.query.affiliatesTable.findFirst({
    where: and(eq(affiliatesTable.payoutEmail, normalised), eq(affiliatesTable.isActive, true)),
  });

  if (!affiliate) {
    req.log.info({ email: normalised.slice(0, 3) + "***" }, "affiliate login requested for unknown/inactive email");
    genericResponse();
    return;
  }

  const token = await createLoginToken(affiliate.id);
  const link = `${BASE}/affiliate/verify?token=${token}`;

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    logger.warn({ affiliateId: affiliate.id }, "RESEND_API_KEY not set — affiliate login link not emailed");
    genericResponse();
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Coffee Brew Coach <hello@coffeebrew.coach>",
        to: affiliate.payoutEmail,
        subject: "Your Coffee Brew Coach affiliate login link",
        html: `<p>Hi ${affiliate.name ?? "there"},</p><p>Click below to sign in to your affiliate dashboard. This link expires in 15 minutes and can only be used once.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      }),
    });
    if (!response.ok) {
      logger.error({ affiliateId: affiliate.id, status: response.status }, "affiliate login email failed to send");
    }
  } catch (err) {
    logger.error({ err, affiliateId: affiliate.id }, "affiliate login email threw");
  }

  genericResponse();
});

// ── GET /affiliate/verify — redeem token, start session ──────────────────────

router.get("/affiliate/verify", async (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) {
    res.status(400).send("Missing login token.");
    return;
  }

  const affiliate = await redeemLoginToken(token);
  if (!affiliate) {
    res.status(401).send(
      `<p style="font-family:sans-serif;padding:40px;text-align:center;">This login link is invalid or has expired. <a href="/affiliate/login">Request a new one</a>.</p>`,
    );
    return;
  }

  setAffiliateSessionCookie(res, affiliate.id);
  res.redirect(302, "/affiliate/dashboard");
});

// ── POST /api/affiliate/logout ───────────────────────────────────────────────

router.post("/api/affiliate/logout", (_req, res) => {
  clearAffiliateSessionCookie(res);
  res.json({ ok: true });
});

// ── GET /affiliate/dashboard — gated, real data ──────────────────────────────

router.get("/affiliate/dashboard", requireAffiliateAuth, async (req, res) => {
  const affiliate = req.affiliate!;

  const [activeReferredSubscribers, rates, ledgerRows] = await Promise.all([
    countActiveReferredSubscribers(affiliate.userId),
    getCurrentRates(),
    db
      .select({
        id: commissionLedgerTable.id,
        periodMonth: commissionLedgerTable.periodMonth,
        planType: commissionLedgerTable.planType,
        amountCents: commissionLedgerTable.amountCents,
        status: commissionLedgerTable.status,
        createdAt: commissionLedgerTable.createdAt,
        paidAt: commissionLedgerTable.paidAt,
        batchStatus: payoutBatchesTable.status,
      })
      .from(commissionLedgerTable)
      .leftJoin(payoutBatchesTable, eq(commissionLedgerTable.payoutBatchId, payoutBatchesTable.id))
      .where(eq(commissionLedgerTable.affiliateUserId, affiliate.userId))
      .orderBy(desc(commissionLedgerTable.createdAt))
      .limit(24),
  ]);

  const [totals] = await db
    .select({
      totalCents: dsql<number>`coalesce(sum(${commissionLedgerTable.amountCents}), 0)`,
      paidCents: dsql<number>`coalesce(sum(${commissionLedgerTable.amountCents}) filter (where ${commissionLedgerTable.status} = 'paid'), 0)`,
      pendingCents: dsql<number>`coalesce(sum(${commissionLedgerTable.amountCents}) filter (where ${commissionLedgerTable.status} != 'paid' and ${commissionLedgerTable.status} != 'voided'), 0)`,
    })
    .from(commissionLedgerTable)
    .where(eq(commissionLedgerTable.affiliateUserId, affiliate.userId));

  let monthlyRateCents: number | null;
  try {
    monthlyRateCents = resolveRateCents(affiliate, "monthly", rates);
  } catch (e) {
    if (e instanceof MissingCommissionRateError) {
      logger.error({ affiliateId: affiliate.id, err: e }, "ADMIN ALERT: Affiliate dashboard loaded but no active commission rate found for monthly plan — commission_phases may have a gap");
      monthlyRateCents = null;
    } else {
      throw e;
    }
  }
  const currentTierIdx = tierIndex(affiliate.tier);
  const nextTier = TIER_LADDER[currentTierIdx + 1];

  const rows = ledgerRows
    .map(
      r => `<tr>
        <td>${r.periodMonth}</td>
        <td>${r.planType}</td>
        <td>${centsToDollars(r.amountCents)}</td>
        <td><span class="pill pill-${r.status}">${r.status}</span></td>
      </tr>`,
    )
    .join("\n");

  const connectStatus = affiliate.connectOnboardingComplete
    ? `<span class="pill pill-paid">Connected &middot; verified</span>`
    : affiliate.taxFormComplete
      ? `<span class="pill pill-pending">Tax form on file &middot; Stripe Connect pending</span>`
      : `<span class="pill pill-voided">Payout setup incomplete</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Affiliate Dashboard | Coffee Brew Coach</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, system-ui, sans-serif; background: #FAF7F2; color: #2C1A0E; }
    header.top { background: #fff; border-bottom: 1px solid #E0D5C8; padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 500; font-size: 19px; display: flex; align-items: center; gap: 10px; }
    .brand .icon { width: 30px; height: 30px; border-radius: 8px; background: #2C1A0E; color: #FAF7F2; display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 15px; }
    .who { display: flex; align-items: center; gap: 14px; font-size: 13px; color: #8B6347; }
    .logout { background: none; border: none; color: #A89080; font-size: 13px; cursor: pointer; text-decoration: underline; font-family: inherit; }
    main { max-width: 1080px; margin: 0 auto; padding: 28px; display: grid; gap: 20px; grid-template-columns: 1.4fr 1fr; }
    @media (max-width: 800px) { main { grid-template-columns: 1fr; } }
    .card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(44,26,14,0.05); }
    .card.dark { background: #2C1A0E; color: #FAF7F2; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #A89080; font-weight: 600; margin-bottom: 8px; }
    .card.dark .label { color: #C8A97A; }
    .big { font-size: 40px; font-weight: 800; font-family: 'Fraunces', Georgia, serif; }
    .tier-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
    .tier-name { font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 500; }
    .tier-rate { color: #8B6347; font-size: 14px; }
    .ladder { display: flex; gap: 6px; margin-bottom: 10px; }
    .ladder-seg { flex: 1; height: 6px; border-radius: 3px; background: #EEE3D6; }
    .ladder-seg.on { background: #8B6347; }
    .ladder-labels { display: flex; justify-content: space-between; font-size: 11px; color: #A89080; }
    .ladder-labels .active { color: #2C1A0E; font-weight: 700; }
    .progress-note { font-size: 13px; color: #6B4226; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 9px 6px; border-bottom: 1px solid #F0EBE3; }
    th { color: #A89080; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .pill { font-size: 11px; padding: 3px 9px; border-radius: 100px; font-weight: 600; }
    .pill-paid { background: #E8F5EE; color: #1B6B3A; }
    .pill-pending, .pill-approved { background: #FCF3D9; color: #92650B; }
    .pill-voided { background: #FBE8E8; color: #B91C1C; }
    .empty { color: #A89080; font-size: 14px; padding: 12px 0; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  </style>
</head>
<body>
  <header class="top">
    <div class="brand"><span class="icon">☕</span> Partner Dashboard</div>
    <div class="who">
      Signed in as <strong>${affiliate.name ?? affiliate.payoutEmail}</strong>
      <button class="logout" id="logout">Log out</button>
    </div>
  </header>

  <main>
    <div class="card dark">
      <div class="label">Total earnings</div>
      <div class="big">${centsToDollars(Number(totals?.totalCents ?? 0))}</div>
      <div class="stat-grid" style="margin-top:18px;">
        <div>
          <div class="label">Paid out</div>
          <div style="font-size:20px;font-weight:700;">${centsToDollars(Number(totals?.paidCents ?? 0))}</div>
        </div>
        <div>
          <div class="label">Pending</div>
          <div style="font-size:20px;font-weight:700;">${centsToDollars(Number(totals?.pendingCents ?? 0))}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="label">Your tier</div>
      <div class="tier-row">
        <span class="tier-name">${TIER_LADDER[currentTierIdx]?.label}</span>
        <span class="tier-rate">${monthlyRateCents !== null ? centsToDollars(monthlyRateCents) + "/mo per subscriber" : "Rate unavailable — contact support"}</span>
      </div>
      <div class="ladder">
        ${TIER_LADDER.map((_, i) => `<div class="ladder-seg ${i <= currentTierIdx ? "on" : ""}"></div>`).join("")}
      </div>
      <div class="ladder-labels">
        ${TIER_LADDER.map((t, i) => `<span class="${i === currentTierIdx ? "active" : ""}">${t.label}</span>`).join("")}
      </div>
      <p class="progress-note">
        ${activeReferredSubscribers} active referred subscriber${activeReferredSubscribers === 1 ? "" : "s"}
        ${nextTier ? ` &middot; ${Math.max(0, nextTier.min - activeReferredSubscribers)} more to reach ${nextTier.label} (${nextTier.rate})` : " &middot; you're at our highest tier"}
      </p>
    </div>

    <div class="card" style="grid-column: 1 / -1;">
      <div class="label">Payout account</div>
      <p style="margin-bottom:10px;">${connectStatus}</p>
      <p style="font-size:13px;color:#8B6347;">Tax forms and bank details are handled securely by Stripe. Payouts run automatically once approved.</p>
    </div>

    <div class="card" style="grid-column: 1 / -1;">
      <div class="label">Commission history</div>
      ${
        ledgerRows.length
          ? `<table>
        <thead><tr><th>Period</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : `<p class="empty">No commissions recorded yet — they'll show up here as your referrals convert to paying subscribers.</p>`
      }
    </div>
  </main>

  <script>
  document.getElementById("logout").addEventListener("click", function () {
    fetch("/api/affiliate/logout", { method: "POST" }).then(function () {
      window.location.href = "/affiliate/login";
    });
  });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
