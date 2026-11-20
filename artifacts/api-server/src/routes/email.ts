/**
 * Email plumbing that lives on the public site:
 *   GET/POST /email/unsubscribe   — signed one-tap opt-out (also RFC 8058 one-click)
 *   GET      /open?to=brew        — hand-off page: opens the app if installed, App Store if not
 *   /api/admin/lifecycle/*        — preview, send a test to yourself, force a tick (x-admin-key)
 */
import { Router, type Request, type Response } from "express";
import { db, usersTable, brewsTable, emailFeedbackTable } from "@workspace/db";
import { and, count, desc, eq } from "drizzle-orm";
import { buildPage } from "../lib/page-template.js";
import {
  feedbackToken,
  feedbackUrl,
  unsubscribeUrl,
  verifyFeedbackToken,
  verifyUnsubscribeToken,
} from "../lib/email-unsubscribe.js";
import { FOUNDER_INBOX, sendEmail } from "../lib/email.js";
import {
  APP_STORE_URL,
  BREWED_ONCE_TEMPLATE,
  FEEDBACK_REASONS,
  countBrewedOnce,
  countNeverBrewed,
  renderBrewedOnce,
  renderNeverBrewed,
  runLifecycleTick,
  type NeverBrewedVariant,
  type RenderedEmail,
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

// ── /feedback — one-tap answers from lifecycle emails ───────────────────────
// GET records the tapped reason (so a single tap counts) and offers an optional
// comment box; POST relays the comment to the founder's inbox. Links are
// HMAC-signed per user. u=0 with its own valid token is a review/test link:
// it renders and relays (marked [TEST]) but stores nothing.

const FOLLOW_UPS: Record<string, string> = {
  forget: "Makes sense — it's a once-a-day app. If a nudge would help, the app can send one morning note with your next tweak (Settings → Brew reminders). Or tell me what would actually work for you:",
  effort: "Which part felt slow or fiddly? Tell me and I'll trim it:",
  advice: "What did it suggest, and what happened when you tried it? This helps me tune the coaching:",
  broken: "What happened? The more detail the better — what you tapped and what you saw:",
  happy: "Love that — that's the goal. If anything would make the app worth keeping around anyway, I'd like to hear it:",
  other: "What's on your mind? Anything goes:",
};

const feedbackThrottle = new Map<number, number[]>();

function readFeedbackParams(src: Record<string, unknown>): { u: number; t: string; s: string; r: string } | null {
  const u = Number(src["u"]);
  const t = String(src["t"] ?? "");
  const s = String(src["s"] ?? "");
  const r = String(src["r"] ?? "");
  if (!FEEDBACK_REASONS.some((x) => x.key === r) || s.length === 0 || s.length > 40) return null;
  const isTest = u === 0 && t === feedbackToken(0);
  if (!isTest && !verifyFeedbackToken(u, t)) return null;
  return { u, t, s, r };
}

const formCss = `<style>
.fb-form textarea{width:100%;min-height:140px;padding:14px;border:1px solid #E0D5C8;border-radius:12px;font:inherit;font-size:16px;color:#2C1A0E;background:#fff;box-sizing:border-box}
.fb-form button{margin-top:12px;background:#2C1A0E;color:#FAF7F2;border:0;border-radius:100px;padding:13px 22px;font:inherit;font-weight:600;font-size:16px;cursor:pointer}
.fb-picked{display:inline-block;padding:6px 12px;border-radius:100px;background:#F3ECE2;font-size:14px}
</style>`;

router.get("/feedback", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const p = readFeedbackParams(req.query as Record<string, unknown>);
  if (!p) {
    res.status(400).send(page("Link not recognised", "That link didn't work.", `<p>It may have been cut off by your email app. You can always reach us from the app: Settings → Contact us.</p>`));
    return;
  }
  if (p.u !== 0) {
    const existing = await db
      .select({ id: emailFeedbackTable.id })
      .from(emailFeedbackTable)
      .where(and(eq(emailFeedbackTable.userId, p.u), eq(emailFeedbackTable.template, p.s), eq(emailFeedbackTable.reason, p.r)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(emailFeedbackTable).values({ userId: p.u, template: p.s, reason: p.r });
    }
  }
  const label = FEEDBACK_REASONS.find((x) => x.key === p.r)!.label;
  res.send(page("Thanks", "Thanks — that really helps.", `${formCss}
<p><span class="fb-picked">${label}</span></p>
<p>${FOLLOW_UPS[p.r]}</p>
<form class="fb-form" method="post" action="/feedback">
  <input type="hidden" name="u" value="${p.u}"/><input type="hidden" name="t" value="${p.t}"/>
  <input type="hidden" name="s" value="${p.s}"/><input type="hidden" name="r" value="${p.r}"/>
  <textarea name="comment" maxlength="4000" placeholder="Optional — but I read every one."></textarea>
  <button type="submit">Send to Chris</button>
</form>
<p style="font-size:14px;color:#8B6347">Your answer's already saved — the note is a bonus.</p>`));
});

router.post("/feedback", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const p = readFeedbackParams(req.body as Record<string, unknown>);
  const comment = String((req.body as Record<string, unknown>)["comment"] ?? "").trim().slice(0, 4000);
  if (!p) {
    res.status(400).send(page("Link not recognised", "That didn't go through.", `<p>Try the link in the email again, or reach us from the app: Settings → Contact us.</p>`));
    return;
  }
  if (!comment) {
    res.send(page("Thanks", "Got it — thanks.", `<p>Your answer's saved. Happy brewing.</p>`));
    return;
  }

  const now = Date.now();
  const stamps = (feedbackThrottle.get(p.u) ?? []).filter((x) => now - x < 60 * 60 * 1000);
  if (stamps.length >= 5) {
    res.status(429).send(page("Thanks", "Got it — thanks.", `<p>That's plenty for now — I've got your notes.</p>`));
    return;
  }
  stamps.push(now);
  feedbackThrottle.set(p.u, stamps);

  const label = FEEDBACK_REASONS.find((x) => x.key === p.r)!.label;
  let who = "(test link)";
  let replyTo: string | undefined;
  let brews = 0;
  if (p.u !== 0) {
    const latest = await db
      .select({ id: emailFeedbackTable.id })
      .from(emailFeedbackTable)
      .where(and(eq(emailFeedbackTable.userId, p.u), eq(emailFeedbackTable.template, p.s), eq(emailFeedbackTable.reason, p.r)))
      .orderBy(desc(emailFeedbackTable.id))
      .limit(1);
    if (latest[0]) {
      await db.update(emailFeedbackTable).set({ comment, commentedAt: new Date() }).where(eq(emailFeedbackTable.id, latest[0].id));
    } else {
      await db.insert(emailFeedbackTable).values({ userId: p.u, template: p.s, reason: p.r, comment, commentedAt: new Date() });
    }
    const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, p.u)).limit(1);
    who = user?.email ?? `user ${p.u}`;
    replyTo = user?.email ?? undefined;
    const [row] = await db.select({ n: count() }).from(brewsTable).where(eq(brewsTable.userId, p.u));
    brews = Number(row?.n ?? 0);
  }

  try {
    await sendEmail({
      to: FOUNDER_INBOX,
      ...(replyTo ? { replyTo } : {}),
      subject: `${p.u === 0 ? "[TEST] " : ""}Feedback: ${label}`,
      text: [
        `From: ${who}${p.u !== 0 ? ` (${brews} brew${brews === 1 ? "" : "s"} logged)` : ""}`,
        `Email: ${p.s}`,
        `Answer: ${label}`,
        "",
        comment,
        "",
        replyTo ? "Hit reply to answer them directly." : "",
      ].join("\n"),
    });
  } catch (err) {
    req.log.error({ err }, "feedback relay failed");
  }

  res.send(page("Thanks", "Sent — thank you.", `<p>I'll read it personally. If you asked something or something's broken, I'll get back to you by email.</p>`));
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

/** Renders the requested template with sample data. Links point at user 0 (review mode). */
function renderForReview(req: Request): { template: string; email: RenderedEmail } {
  const postalAddress = process.env["EMAIL_POSTAL_ADDRESS"] ?? "[EMAIL_POSTAL_ADDRESS not set]";
  if (req.query["template"] === BREWED_ONCE_TEMPLATE) {
    const days = Number(req.query["days"] ?? 40) || 40;
    const email = renderBrewedOnce(
      {
        coffeeName: "La Colmena",
        method: "V60",
        adjustment: String(req.query["adjustment"] ?? "grind_finer"),
        brewedAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
      {
        unsubscribeUrl: unsubscribeUrl(0),
        postalAddress,
        feedbackUrl: (reason) => feedbackUrl(0, BREWED_ONCE_TEMPLATE, reason),
      },
    );
    return { template: BREWED_ONCE_TEMPLATE, email };
  }
  return { template: "never_brewed", email: renderNeverBrewed(variantOf(req), { unsubscribeUrl: unsubscribeUrl(0), postalAddress }) };
}

router.get("/api/admin/lifecycle/preview", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { template, email } = renderForReview(req);
  if (req.query["format"] === "html") {
    res.type("text/html").send(email.html);
    return;
  }
  res.json({
    template,
    eligible: {
      never_brewed_recent: await countNeverBrewed("recent"),
      never_brewed_older: await countNeverBrewed("older"),
      brewed_once: await countBrewedOnce(),
    },
    flags: {
      LIFECYCLE_EMAILS: process.env["LIFECYCLE_EMAILS"] ?? null,
      LIFECYCLE_NEVER_BREWED_OLDER: process.env["LIFECYCLE_NEVER_BREWED_OLDER"] ?? null,
      LIFECYCLE_BREWED_ONCE: process.env["LIFECYCLE_BREWED_ONCE"] ?? null,
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
  const { template, email } = renderForReview(req);
  const id = await sendEmail({ to, subject: `[TEST] ${email.subject}`, text: email.text, html: email.html });
  res.json({ sent: true, to, template, resendId: id });
});

router.post("/api/admin/lifecycle/run", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await runLifecycleTick({ force: req.query["force"] === "1" });
  res.json(result);
});

export default router;
