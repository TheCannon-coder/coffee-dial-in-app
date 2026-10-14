/**
 * Email plumbing that lives on the public site:
 *   GET/POST /email/unsubscribe   — signed one-tap opt-out (also RFC 8058 one-click)
 *   GET      /open?to=brew        — hand-off page: opens the app if installed, App Store if not
 *   /api/admin/lifecycle/*        — preview, send a test to yourself, force a tick (x-admin-key)
 */
import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildPage } from "../lib/page-template.js";
import { verifyUnsubscribeToken, unsubscribeUrl } from "../lib/email-unsubscribe.js";
import { sendEmail } from "../lib/email.js";
import {
  APP_STORE_URL,
  countNeverBrewed,
  renderNeverBrewed,
  runLifecycleTick,
  type NeverBrewedVariant,
} from "../lib/lifecycle.js";

const router = Router();
const BASE = "https://www.coffeebrew.coach";

function page(title: string, heading: string, body: string): string {
  return buildPage({
    title,
    description: heading,
    canonical: `${BASE}/email/unsubscribe`,
    bodyHtml: `
<header class="content-hero"><div class="content-hero-inner"><h1>${heading}</h1></div></header>
<div class="content-body">${body}</div>`,
  }).replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="noindex, nofollow" />');
}

async function optOut(req: Request): Promise<"ok" | "invalid"> {
  const u = Number(req.query["u"]);
  const t = String(req.query["t"] ?? "");
  if (!verifyUnsubscribeToken(u, t)) return "invalid";
  await db
    .update(usersTable)
    .set({ emailOptOut: true, emailOptOutAt: new Date() })
    .where(eq(usersTable.id, u));
  return "ok";
}

router.get("/email/unsubscribe", async (req, res) => {
  const outcome = await optOut(req);
  res.setHeader("Cache-Control", "no-store");
  if (outcome === "invalid") {
    res.status(400).send(page("Link not recognised", "That link didn't work.", `<p>It may have been cut off by your email app. Reply to any message from us, or write to <a href="mailto:support@coffeebrew.coach">support@coffeebrew.coach</a>, and we'll take you off the list by hand.</p>`));
    return;
  }
  res.send(page("Unsubscribed", "You're unsubscribed.", `<p>No more emails like that one. Your account and your brews are untouched — the app works exactly as before.</p><p>Changed your mind later? Reply to any message from us and we'll switch it back on.</p>`));
});

// RFC 8058 one-click: mail clients POST here from a "Unsubscribe" button.
router.post("/email/unsubscribe", async (req, res) => {
  const outcome = await optOut(req);
  res.setHeader("Cache-Control", "no-store");
  res.status(outcome === "ok" ? 200 : 400).type("text/plain").send(outcome === "ok" ? "Unsubscribed" : "Invalid link");
});

// ── /open — tries the app, falls back to the App Store ───────────────────────
const OPEN_TARGETS: Record<string, string> = { brew: "brew-setup", home: "" };

router.get("/open", (req, res) => {
  const to = String(req.query["to"] ?? "home");
  const path = OPEN_TARGETS[to] ?? "";
  const deepLink = `dial-in://${path}`;
  res.setHeader("Cache-Control", "no-store");
  res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<meta name="apple-itunes-app" content="app-id=6777418888, app-argument=${deepLink}"/>
<title>Opening Coffee Brew Coach…</title>
<style>body{margin:0;background:#FAF7F2;color:#2C1A0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px}a{color:#2C1A0E}.btn{display:inline-block;margin-top:14px;background:#2C1A0E;color:#FAF7F2;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:100px}</style>
</head><body><div>
<p style="font-family:Georgia,serif;font-style:italic;color:#8B6347;margin:0 0 10px">Coffee Brew Coach</p>
<p style="font-size:18px;margin:0">Opening the app…</p>
<p style="font-size:14px;color:#8B6347;margin:10px 0 0">Nothing happening? <a href="${APP_STORE_URL}">Get it on the App Store</a></p>
<a class="btn" href="${deepLink}">Open the app</a>
</div>
<script>
(function(){var t=setTimeout(function(){window.location.replace(${JSON.stringify(APP_STORE_URL)})},1600);
document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(t)});
window.location.href=${JSON.stringify(deepLink)};})();
</script></body></html>`);
});

// ── Admin: preview / test / force-run ────────────────────────────────────────
function requireAdmin(req: Request, res: Response): boolean {
  const expected = process.env["ADMIN_KEY"];
  if (!expected || req.headers["x-admin-key"] !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

function variantOf(req: Request): NeverBrewedVariant {
  return req.query["variant"] === "older" ? "older" : "recent";
}

router.get("/api/admin/lifecycle/preview", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const variant = variantOf(req);
  const postalAddress = process.env["EMAIL_POSTAL_ADDRESS"] ?? "[EMAIL_POSTAL_ADDRESS not set]";
  const email = renderNeverBrewed(variant, { unsubscribeUrl: unsubscribeUrl(0), postalAddress });
  if (req.query["format"] === "html") {
    res.type("text/html").send(email.html);
    return;
  }
  res.json({
    template: "never_brewed",
    variant,
    eligible: { recent: await countNeverBrewed("recent"), older: await countNeverBrewed("older") },
    flags: {
      LIFECYCLE_EMAILS: process.env["LIFECYCLE_EMAILS"] ?? null,
      LIFECYCLE_NEVER_BREWED_OLDER: process.env["LIFECYCLE_NEVER_BREWED_OLDER"] ?? null,
      LIFECYCLE_DRY_RUN: process.env["LIFECYCLE_DRY_RUN"] ?? null,
      EMAIL_POSTAL_ADDRESS: process.env["EMAIL_POSTAL_ADDRESS"] ? "set" : null,
    },
    subject: email.subject,
    text: email.text,
  });
});

router.post("/api/admin/lifecycle/send-test", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const to = String(req.query["to"] ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    res.status(400).json({ error: "to= must be an email address" });
    return;
  }
  const variant = variantOf(req);
  const postalAddress = process.env["EMAIL_POSTAL_ADDRESS"] ?? "[EMAIL_POSTAL_ADDRESS not set]";
  const email = renderNeverBrewed(variant, { unsubscribeUrl: unsubscribeUrl(0), postalAddress });
  const id = await sendEmail({ to, subject: `[TEST] ${email.subject}`, text: email.text, html: email.html });
  res.json({ sent: true, to, variant, resendId: id });
});

router.post("/api/admin/lifecycle/run", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await runLifecycleTick({ force: req.query["force"] === "1" });
  res.json(result);
});

export default router;
