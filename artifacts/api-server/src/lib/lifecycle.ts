/**
 * Lifecycle email: the server-side half of the marketing team's Lifecycle agent.
 *
 * The agent writes copy and rules (marketing/email/*.md, reviewed by Chris once
 * per template type); this module executes them deterministically. Every send is
 * recorded in lifecycle_sends, and the selector excludes anyone with a row for
 * the same template, so a person can never get the same email twice.
 *
 * Flags (Railway):
 *   LIFECYCLE_EMAILS=true            master switch — nothing sends without it
 *   LIFECYCLE_NEVER_BREWED_OLDER=true  also send the 30+ day variant (off until the
 *                                    first batch has been read)
 *   LIFECYCLE_BREWED_ONCE=true       send the brewed-once follow-up (its own switch:
 *                                    the master flag is already on for never-brewed)
 *   LIFECYCLE_DRY_RUN=true           log who would be emailed, send nothing
 *   LIFECYCLE_MAX_PER_TICK=25        cap per hourly tick
 *   EMAIL_POSTAL_ADDRESS             required by CASL/CAN-SPAM; refuses to send without it
 */
import { db, lifecycleSendsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./email.js";
import { feedbackUrl, unsubscribeUrl } from "./email-unsubscribe.js";
import { logger } from "./logger.js";

export const APP_STORE_URL = "https://apps.apple.com/app/id6777418888";
export const OPEN_BREW_URL = "https://www.coffeebrew.coach/open?to=brew";

export type NeverBrewedVariant = "recent" | "older";
export type RenderedEmail = { subject: string; text: string; html: string };

export const NEVER_BREWED_TEMPLATE = "never_brewed";
export const NEVER_BREWED_SUBJECT = "Still got a cup you don't love?";

// Founder accounts never receive lifecycle mail. Mirrors marketing/scripts/funnel.mjs.
const NOT_FOUNDER = sql`coalesce(u.email, '') !~ 'cannoncoffeeco' and not coalesce(u.pro_permanent, false)`;

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function opener(variant: NeverBrewedVariant): string {
  return variant === "recent"
    ? "You grabbed Coffee Brew Coach a little while ago and haven't logged a brew yet. Totally fine — most people don't on day one."
    : "You grabbed Coffee Brew Coach a while back and never got around to a brew. No worries at all — I'm not here to nag, just to make it easy.";
}

export function renderNeverBrewed(
  variant: NeverBrewedVariant,
  opts: { unsubscribeUrl: string; postalAddress: string },
): RenderedEmail {
  const open = opener(variant);
  const p2 =
    "Here's the whole thing: make your coffee the way you normally do, open the app, and tap how it tasted. Bitter, sour, weak, whatever it was. It gives you one thing to change next time. Not a recipe, not ten tips. One change.";
  const p3 = "That's it. It takes about a minute, and you'll know what to try on the next cup.";
  const p4 = "If the app's gone from your phone, it's on the App Store, and your account's still here.";
  const footer = `You're getting this because you made a Coffee Brew Coach account. Don't want these? Unsubscribe — one tap, no questions.\nCoffee Brew Coach · ${opts.postalAddress} · hello@coffeebrew.coach`;

  const text = [
    "Hey :)",
    "",
    open,
    "",
    p2,
    "",
    p3,
    "",
    `Open the app and log a brew: ${OPEN_BREW_URL}`,
    "",
    p4,
    "",
    "Thanks for giving it a go.",
    "",
    "— Chris",
    "Coffee Brew Coach",
    "",
    "----",
    footer.replace("Unsubscribe —", `Unsubscribe (${opts.unsubscribeUrl}) —`),
  ].join("\n");

  const para = (s: string) =>
    `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#2C1A0E;">${esc(s)}</p>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(NEVER_BREWED_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;">
<div style="max-width:560px;margin:0 auto;padding:36px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;color:#8B6347;">Coffee Brew Coach</p>
  ${para("Hey :)")}
  ${para(open)}
  ${para(p2)}
  ${para(p3)}
  <p style="margin:6px 0 26px;"><a href="${OPEN_BREW_URL}" style="display:inline-block;background:#2C1A0E;color:#FAF7F2;text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:100px;">Open the app and log a brew &rarr;</a></p>
  ${para(p4)}
  ${para("Thanks for giving it a go.")}
  <p style="margin:0 0 4px;font-size:16px;line-height:1.65;color:#2C1A0E;">— Chris</p>
  <p style="margin:0 0 32px;font-size:14px;color:#8B6347;">Coffee Brew Coach</p>
  <hr style="border:none;border-top:1px solid #E0D5C8;margin:0 0 16px;"/>
  <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#8B6347;">You're getting this because you made a Coffee Brew Coach account. Don't want these? <a href="${opts.unsubscribeUrl}" style="color:#6B4226;">Unsubscribe</a> — one tap, no questions.</p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#A89080;">Coffee Brew Coach · ${esc(opts.postalAddress)} · hello@coffeebrew.coach</p>
</div>
</body></html>`;

  return { subject: NEVER_BREWED_SUBJECT, text, html };
}

// ── Brewed once: the follow-up for people who logged exactly one brew ────────

export const BREWED_ONCE_TEMPLATE = "brewed_once";
export const BREWED_ONCE_SUBJECT = "Your next tweak is still waiting";

/** One-tap answers to "what's kept you from brewing with the app more?" */
export const FEEDBACK_REASONS: Array<{ key: string; label: string }> = [
  { key: "forget", label: "I keep forgetting to open it" },
  { key: "effort", label: "Logging a brew takes too long" },
  { key: "advice", label: "The advice didn't help my coffee" },
  { key: "broken", label: "Something in the app isn't working" },
  { key: "happy", label: "My coffee's already where I want it" },
  { key: "other", label: "Something else" },
];

const TWEAKS: Record<string, string> = {
  grind_finer: "grind a touch finer",
  grind_coarser: "grind a touch coarser",
  more_coffee: "use a little more coffee",
  less_coffee: "use a little less coffee",
  steep_longer: "let it steep a bit longer",
  steep_shorter: "cut the steep a bit shorter",
};

export type BrewedOnceContext = {
  coffeeName: string | null;
  method: string | null;
  adjustment: string | null;
  brewedAt: Date;
};

function coffeeLabel(ctx: BrewedOnceContext): string {
  const name = (ctx.coffeeName ?? "").trim();
  const method = (ctx.method ?? "").trim();
  if (name && name.toLowerCase() !== method.toLowerCase()) return name;
  return method ? `a ${method} brew` : "a coffee";
}

export function renderBrewedOnce(
  ctx: BrewedOnceContext,
  opts: { unsubscribeUrl: string; postalAddress: string; feedbackUrl: (reason: string) => string },
): RenderedEmail {
  const when = ctx.brewedAt.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const tweak = TWEAKS[ctx.adjustment ?? ""];
  const oldBag = Date.now() - ctx.brewedAt.getTime() > 30 * 24 * 60 * 60 * 1000;

  const p1 = tweak
    ? `Back on ${when} you brewed ${coffeeLabel(ctx)} and told Coffee Brew Coach how it tasted. It gave you one thing to try next time: ${tweak}.`
    : `Back on ${when} you brewed ${coffeeLabel(ctx)} and told Coffee Brew Coach how it tasted. It sounded like a great cup, so the advice was to keep everything the same.`;
  const p2 = oldBag
    ? "If that bag's long gone, no worries. The same idea works on whatever you're brewing now."
    : null;
  const p3 = tweak
    ? "Your next cup is a good chance to try it. Make that one change, then tap how it tasted. That's how dialing in works: one tweak at a time, tasting as you go."
    : "Beans keep changing as a bag ages, so your next cup is a good time to check in. Brew it the same way and tap how it tasted.";
  const askTitle = "Quick question, if you've got ten seconds:";
  const askBody = "What's kept you from brewing with the app more? One tap is plenty. I read every answer myself.";
  const footer = `You're getting this because you made a Coffee Brew Coach account. Don't want these? Unsubscribe — one tap, no questions.\nCoffee Brew Coach · ${opts.postalAddress} · hello@coffeebrew.coach`;

  const text = [
    "Hey :)",
    "",
    p1,
    ...(p2 ? ["", p2] : []),
    "",
    p3,
    "",
    `Log my next brew: ${OPEN_BREW_URL}`,
    "",
    askTitle,
    askBody,
    "",
    ...FEEDBACK_REASONS.map((r) => `- ${r.label}: ${opts.feedbackUrl(r.key)}`),
    "",
    "Thanks for giving it a go.",
    "",
    "— Chris",
    "Coffee Brew Coach",
    "",
    "----",
    footer.replace("Unsubscribe —", `Unsubscribe (${opts.unsubscribeUrl}) —`),
  ].join("\n");

  const para = (s: string) =>
    `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#2C1A0E;">${esc(s)}</p>`;
  const reasonLinks = FEEDBACK_REASONS.map(
    (r) =>
      `<a href="${opts.feedbackUrl(r.key)}" style="display:block;margin:0 0 8px;padding:12px 16px;border:1px solid #E0D5C8;border-radius:12px;background:#FFFFFF;color:#2C1A0E;text-decoration:none;font-size:15px;">${esc(r.label)}</a>`,
  ).join("\n    ");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(BREWED_ONCE_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;">
<div style="max-width:560px;margin:0 auto;padding:36px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;color:#8B6347;">Coffee Brew Coach</p>
  ${para("Hey :)")}
  ${para(p1)}
  ${p2 ? para(p2) : ""}
  ${para(p3)}
  <p style="margin:6px 0 30px;"><a href="${OPEN_BREW_URL}" style="display:inline-block;background:#2C1A0E;color:#FAF7F2;text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:100px;">Log my next brew &rarr;</a></p>
  <div style="margin:0 0 28px;padding:20px;border-radius:16px;background:#F3ECE2;">
    <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#2C1A0E;">${esc(askTitle)}</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#6B4226;">${esc(askBody)}</p>
    ${reasonLinks}
  </div>
  ${para("Thanks for giving it a go.")}
  <p style="margin:0 0 4px;font-size:16px;line-height:1.65;color:#2C1A0E;">— Chris</p>
  <p style="margin:0 0 32px;font-size:14px;color:#8B6347;">Coffee Brew Coach</p>
  <hr style="border:none;border-top:1px solid #E0D5C8;margin:0 0 16px;"/>
  <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#8B6347;">You're getting this because you made a Coffee Brew Coach account. Don't want these? <a href="${opts.unsubscribeUrl}" style="color:#6B4226;">Unsubscribe</a> — one tap, no questions.</p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#A89080;">Coffee Brew Coach · ${esc(opts.postalAddress)} · hello@coffeebrew.coach</p>
</div>
</body></html>`;

  return { subject: BREWED_ONCE_SUBJECT, text, html };
}

type BrewedOnceCandidate = { id: number; email: string; ctx: BrewedOnceContext };

/**
 * People with exactly one brew, at least 5 days old. Also skips anyone who got
 * any lifecycle email in the last 7 days, so two templates never stack up.
 */
export async function selectBrewedOnce(limit: number): Promise<BrewedOnceCandidate[]> {
  const result = await db.execute(sql`
    select u.id, u.email, b.coffee_name, b.method, b.adjustment, b.created_at
    from users u
    join lateral (
      select coffee_name, method, adjustment, created_at
      from brews where user_id = u.id
    ) b on true
    where u.email is not null
      and ${NOT_FOUNDER}
      and not u.email_opt_out
      and (select count(*) from brews x where x.user_id = u.id) = 1
      and b.created_at < now() - interval '5 days'
      and not exists (select 1 from lifecycle_sends s where s.user_id = u.id and s.template = ${BREWED_ONCE_TEMPLATE})
      and not exists (select 1 from lifecycle_sends s where s.user_id = u.id and s.sent_at > now() - interval '7 days')
    order by b.created_at desc
    limit ${limit}
  `);
  return (result.rows as Array<Record<string, unknown>>).map((r) => ({
    id: Number(r["id"]),
    email: String(r["email"]),
    ctx: {
      coffeeName: (r["coffee_name"] as string | null) ?? null,
      method: (r["method"] as string | null) ?? null,
      adjustment: (r["adjustment"] as string | null) ?? null,
      brewedAt: new Date(r["created_at"] as string),
    },
  }));
}

export async function countBrewedOnce(): Promise<number> {
  return (await selectBrewedOnce(10000)).length;
}

type Candidate = { id: number; email: string };

/** Eligible recipients for the never-brewed nudge, newest signups first. */
export async function selectNeverBrewed(variant: NeverBrewedVariant, limit: number): Promise<Candidate[]> {
  const window =
    variant === "recent"
      ? sql`u.created_at < now() - interval '2 days' and u.created_at >= now() - interval '30 days'`
      : sql`u.created_at < now() - interval '30 days'`;
  const result = await db.execute(sql`
    select u.id, u.email
    from users u
    where u.email is not null
      and ${NOT_FOUNDER}
      and not u.email_opt_out
      and ${window}
      and not exists (select 1 from brews b where b.user_id = u.id)
      and not exists (select 1 from lifecycle_sends s where s.user_id = u.id and s.template = ${NEVER_BREWED_TEMPLATE})
    order by u.created_at desc
    limit ${limit}
  `);
  return (result.rows as Array<{ id: number; email: string }>).map((r) => ({ id: Number(r.id), email: r.email }));
}

export async function countNeverBrewed(variant: NeverBrewedVariant): Promise<number> {
  const rows = await selectNeverBrewed(variant, 10000);
  return rows.length;
}

export type TickResult = { sent: number; failed: number; dryRun: number; skipped?: string };

/** Send one rendered email and record the outcome; failures are recorded so they never retry hourly. */
async function deliver(
  user: Candidate,
  email: RenderedEmail,
  template: string,
  variant: string | null,
  dryRun: boolean,
  result: TickResult,
): Promise<void> {
  if (dryRun) {
    result.dryRun += 1;
    logger.info({ userId: user.id, template, variant }, "lifecycle dry run: would send");
    return;
  }
  try {
    const resendId = await sendEmail({
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl(user.id)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    await db.insert(lifecycleSendsTable).values({ userId: user.id, template, variant, status: "sent", resendId });
    result.sent += 1;
  } catch (err) {
    await db.insert(lifecycleSendsTable).values({ userId: user.id, template, variant, status: "failed" });
    result.failed += 1;
    logger.error({ err, userId: user.id, template }, "lifecycle send failed");
  }
}

function flag(name: string): boolean {
  return process.env[name] === "true";
}

/** Daytime in Toronto, roughly: 13:00–22:00 UTC. Emails land in the day, not at 3am. */
function inSendWindow(now = new Date()): boolean {
  const h = now.getUTCHours();
  return h >= 13 && h <= 22;
}

export async function runLifecycleTick(opts: { force?: boolean } = {}): Promise<TickResult> {
  const result: TickResult = { sent: 0, failed: 0, dryRun: 0 };
  if (!flag("LIFECYCLE_EMAILS")) return { ...result, skipped: "LIFECYCLE_EMAILS is not true" };
  const postalAddress = process.env["EMAIL_POSTAL_ADDRESS"];
  if (!postalAddress) return { ...result, skipped: "EMAIL_POSTAL_ADDRESS is not set (required by CASL/CAN-SPAM)" };
  if (!opts.force && !inSendWindow()) return { ...result, skipped: "outside send window (13:00–22:00 UTC)" };

  const max = Math.max(1, Number(process.env["LIFECYCLE_MAX_PER_TICK"] ?? 25) || 25);
  const dryRun = flag("LIFECYCLE_DRY_RUN");

  const batches: Array<{ variant: NeverBrewedVariant; rows: Candidate[] }> = [];
  const recent = await selectNeverBrewed("recent", max);
  batches.push({ variant: "recent", rows: recent });
  if (flag("LIFECYCLE_NEVER_BREWED_OLDER") && recent.length < max) {
    batches.push({ variant: "older", rows: await selectNeverBrewed("older", max - recent.length) });
  }

  // Brewed-once follow-up rides its own flag so it can't start sending just
  // because the master switch is already on for the never-brewed nudge.
  if (flag("LIFECYCLE_BREWED_ONCE")) {
    const budget = max - batches.reduce((n, b) => n + b.rows.length, 0);
    if (budget > 0) {
      for (const user of await selectBrewedOnce(budget)) {
        const email = renderBrewedOnce(user.ctx, {
          unsubscribeUrl: unsubscribeUrl(user.id),
          postalAddress,
          feedbackUrl: (reason) => feedbackUrl(user.id, BREWED_ONCE_TEMPLATE, reason),
        });
        await deliver(user, email, BREWED_ONCE_TEMPLATE, null, dryRun, result);
      }
    }
  }

  for (const { variant, rows } of batches) {
    for (const user of rows) {
      const email = renderNeverBrewed(variant, { unsubscribeUrl: unsubscribeUrl(user.id), postalAddress });
      if (dryRun) {
        result.dryRun += 1;
        logger.info({ userId: user.id, template: NEVER_BREWED_TEMPLATE, variant }, "lifecycle dry run: would send");
        continue;
      }
      try {
        const resendId = await sendEmail({
          to: user.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl(user.id)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        await db.insert(lifecycleSendsTable).values({ userId: user.id, template: NEVER_BREWED_TEMPLATE, variant, status: "sent", resendId });
        result.sent += 1;
      } catch (err) {
        // Record the failure so the next tick doesn't retry the same address forever.
        await db.insert(lifecycleSendsTable).values({ userId: user.id, template: NEVER_BREWED_TEMPLATE, variant, status: "failed" });
        result.failed += 1;
        logger.error({ err, userId: user.id, template: NEVER_BREWED_TEMPLATE }, "lifecycle send failed");
      }
    }
  }

  logger.info(result, "lifecycle tick");
  return result;
}

let running = false;

/** Hourly tick, first one five minutes after boot. Safe to call once at startup. */
export function startLifecycleScheduler(): void {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runLifecycleTick();
    } catch (err) {
      logger.error({ err }, "lifecycle tick crashed");
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 5 * 60 * 1000).unref();
  setInterval(tick, 60 * 60 * 1000).unref();
}
