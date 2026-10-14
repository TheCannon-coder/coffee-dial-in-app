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
 *   LIFECYCLE_DRY_RUN=true           log who would be emailed, send nothing
 *   LIFECYCLE_MAX_PER_TICK=25        cap per hourly tick
 *   EMAIL_POSTAL_ADDRESS             required by CASL/CAN-SPAM; refuses to send without it
 */
import { db, lifecycleSendsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./email.js";
import { unsubscribeUrl } from "./email-unsubscribe.js";
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
