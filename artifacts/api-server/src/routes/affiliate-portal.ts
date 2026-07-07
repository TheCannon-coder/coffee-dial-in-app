/**
 * Affiliate web portal — public explainer page + login-gated dashboard.
 *
 * Independent of REFERRAL_PROGRAM: that flag gates self-serve join and the
 * public earnings calculator, which are intentionally still dark. This
 * portal only serves existing, confirmed (isActive) affiliates — created
 * today via POST /api/admin/affiliates — plus a public marketing page that
 * captures interest through the existing waitlist table instead of a live
 * signup form.
 *
 * Routes:
 *   GET  /affiliate/become         — public SEO explainer page for prospects
 *   GET  /affiliate/login          — email-based login page
 *   POST /api/affiliate/login-request — sends a magic login link (Resend)
 *   GET  /affiliate/verify         — redeems the magic link, sets session cookie
 *   GET  /affiliate/dashboard      — gated dashboard, real data only
 *   POST /api/affiliate/logout     — clears the session cookie
 */

import { Router } from "express";
import { eq, and, desc, sql as dsql } from "drizzle-orm";
import {
  db,
  affiliatesTable,
  commissionLedgerTable,
  payoutBatchesTable,
} from "@workspace/db";
import { buildPage } from "../lib/page-template.js";
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

// ── GET /affiliate/become — public explainer page ────────────────────────────

router.get("/affiliate/become", (_req, res) => {
  const body = `
<header class="content-hero">
  <div class="content-hero-inner">
    <h1>Turn your coffee content into passive income</h1>
    <p class="lead">Join the Coffee Brew Coach affiliate program and earn recurring commissions every month a subscriber you referred stays on Pro — no shipping, no inventory, no extra work after the share.</p>
  </div>
</header>

<div class="content-body">
  <h2>A recurring commission affiliate program for coffee creators</h2>
  <p>Most affiliate programs pay you once. Ours doesn't. Every Pro subscriber you refer to Coffee Brew Coach generates a recurring monthly commission for as long as they stay subscribed — so the referral links you share today keep paying out long after you've posted them. That's the definition of passive income: you do the work once, and it keeps earning.</p>

  <h2>How commissions grow with you</h2>
  <p>Your rate isn't fixed. As more of the people you refer become active, paying subscribers, you're automatically promoted to a higher commission tier — and once you're promoted, you never get moved back down.</p>
  <table class="grind-table">
    <thead><tr><th>Tier</th><th>Active referred subscribers</th><th>Monthly rate</th></tr></thead>
    <tbody>
      ${TIER_LADDER.map(
        t => `<tr><td>${t.label}</td><td>${t.min === 0 ? "0–9" : t.min === 10 ? "10–99" : t.min === 100 ? "100–999" : "1,000+"}</td><td>${t.rate}</td></tr>`,
      ).join("\n      ")}
    </tbody>
  </table>
  <p>Reach Platinum and our founders personally reach out — you're driving a meaningful share of our growth at that point, and we treat that relationship accordingly.</p>

  <h2>Built for creators who talk about coffee</h2>
  <p>If you already make espresso content — YouTube, TikTok, a newsletter, a coffee shop's social presence — your audience is already primed to want a coaching tool that fixes their shots. You're not selling anything; you're recommending something you'd recommend anyway, and getting paid every month for it. See <a href="/how-coffee-youtubers-make-money">how coffee YouTubers make money</a> for a full breakdown of how this compares to sponsorships and one-time gear links.</p>

  <h2>Payouts, made simple</h2>
  <p>Payouts run automatically through Stripe Connect once you're onboarded — no manual invoicing, no chasing payments. Stripe handles your tax forms (W-9 or W-8BEN) and identity verification directly; we handle the commission math, tier promotions, and your dashboard.</p>
  <p><strong>Currently open to affiliates based in the United States and Canada.</strong> Referred users can join from anywhere in the world — only affiliate payouts are limited to US/CA for now, with more countries planned as we grow.</p>

  <h2>What passive income actually looks like here</h2>
  <p>A Standard affiliate with 10 active referred subscribers earns steady monthly income without lifting a finger after the initial share. Climb to Gold or Platinum and it becomes a serious secondary income stream — all from content you were likely already creating.</p>
</div>

<section class="cbc-section" id="waitlist">
  <div class="cbc-inner">
    <h2>Get on the affiliate waitlist</h2>
    <p>We're onboarding affiliates in small batches while we finish rolling out the program. Drop your email and we'll reach out with an invite and next steps.</p>
    <form class="wl-form" id="affiliate-wl-form" novalidate style="max-width:420px;">
      <input class="wl-input" type="email" name="email" placeholder="your@email.com" required autocomplete="email" />
      <button class="wl-submit" type="submit">Join the waitlist</button>
    </form>
    <p class="wl-success" id="affiliate-wl-success" hidden style="margin-top:14px;">You're on the list — we'll be in touch with an invite soon.</p>
    <p class="wl-error" id="affiliate-wl-error" hidden></p>
  </div>
</section>

<section class="cta-section">
  <h2>Already confirmed as an affiliate?</h2>
  <p>Sign in to see your live earnings, tier progress, and payout history.</p>
  <a class="store-btn store-btn-ios" href="/affiliate/login" style="display:inline-flex;">
    <span class="store-btn-text"><span class="store-btn-main">Log in to your dashboard</span></span>
  </a>
</section>

<script>
(function () {
  var form = document.getElementById("affiliate-wl-form");
  var successEl = document.getElementById("affiliate-wl-success");
  var errorEl = document.getElementById("affiliate-wl-error");
  var submitBtn = form.querySelector(".wl-submit");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.querySelector("input").value.trim();
    if (!email) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Joining\u2026";
    errorEl.hidden = true;
    fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, platform: "affiliate" }),
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        if (r.ok) {
          form.hidden = true;
          successEl.hidden = false;
          if (r.data.alreadyJoined) {
            successEl.textContent = "You're already on the list \u2014 we'll be in touch!";
          }
        } else {
          throw new Error(r.data.error || "error");
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Join the waitlist";
        errorEl.textContent = "Something went wrong. Please try again.";
        errorEl.hidden = false;
      });
  });
})();
</script>`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do commissions work in the Coffee Brew Coach affiliate program?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You earn a recurring monthly commission for every Pro subscriber you refer, for as long as they stay subscribed. Your rate starts at $0.75/mo (Standard) and automatically increases as your active referred subscribers grow — Silver at 10+, Gold at 100+, and Platinum at 1,000+ — and it never moves back down once you're promoted.",
        },
      },
      {
        "@type": "Question",
        name: "Who can join the coffee affiliate program?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It's built for creators who talk about coffee — YouTube, TikTok, newsletters, or a coffee shop's social presence. Affiliate payouts are currently open to affiliates based in the United States and Canada, though referred users can join from anywhere in the world.",
        },
      },
      {
        "@type": "Question",
        name: "How do affiliate payouts work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Payouts run automatically through Stripe Connect once you're onboarded — no manual invoicing. Stripe collects your tax forms (W-9 or W-8BEN) and verifies your identity directly; Coffee Brew Coach handles the commission math, tier promotions, and your live dashboard.",
        },
      },
    ],
  };

  const html = buildPage({
    title: "Coffee Affiliate Program — Recurring Commissions for Coffee Creators",
    description:
      "Join the Coffee Brew Coach affiliate program: a recurring commission affiliate program for coffee YouTubers, TikTokers, and newsletter writers. Earn monthly for every Pro subscriber you refer.",
    canonical: `${BASE}/affiliate/become`,
    bodyHtml: body,
    ogImage: `${BASE}/affiliate/og`,
  }).replace(
    "</head>",
    `  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>\n</head>`,
  );

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── GET /affiliate/og — dedicated share image (1200×630 SVG) with tier table ──

router.get("/affiliate/og", (_req, res) => {
  const rows = TIER_LADDER.map((t, i) => {
    const y = 300 + i * 62;
    const range = t.min === 0 ? "0–9" : t.min === 10 ? "10–99" : t.min === 100 ? "100–999" : "1,000+";
    return `
  <text x="80" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#FAF7F2">${t.label}</text>
  <text x="420" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#A89080">${range} referred subs</text>
  <text x="760" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#FAF7F2">${t.rate}</text>`;
  }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#2C1A0E"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#grain)" opacity="0.04"/>
  <defs>
    <pattern id="grain" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="1" height="1" fill="#FAF7F2"/>
    </pattern>
  </defs>

  <circle cx="1100" cy="-80" r="380" fill="none" stroke="#3D2410" stroke-width="80"/>
  <circle cx="1100" cy="-80" r="280" fill="none" stroke="#3D2410" stroke-width="40"/>

  <text x="80" y="90" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-style="italic" fill="#A89080" letter-spacing="1">Coffee Brew Coach — Affiliate Program</text>

  <text x="80" y="170" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="bold" fill="#FAF7F2" letter-spacing="-1">Recurring commissions,</text>
  <text x="80" y="230" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="bold" fill="#FAF7F2" letter-spacing="-1">every month.</text>

  <line x1="80" y1="262" x2="1120" y2="262" stroke="#3D2410" stroke-width="2"/>
${rows}

  <rect x="80" y="540" width="300" height="62" rx="31" fill="#FAF7F2"/>
  <text x="230" y="579" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="bold" fill="#2C1A0E" text-anchor="middle">Become an affiliate</text>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});

// ── GET /affiliate/login — magic-link login page ─────────────────────────────

router.get("/affiliate/login", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Affiliate Log In | Dial In — Coffee Coach</title>
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
    <p class="sub">Dial In — Coffee Coach</p>
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
        from: "Dial In <hello@coffeebrew.coach>",
        to: affiliate.payoutEmail,
        subject: "Your Dial In affiliate login link",
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
  <title>Affiliate Dashboard | Dial In — Coffee Coach</title>
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
