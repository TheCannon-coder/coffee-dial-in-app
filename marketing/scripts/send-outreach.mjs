// Sends approved creator-outreach emails through Resend, one email per creator.
//
//   node marketing/scripts/send-outreach.mjs           # dry run (default): prints what would send
//   node marketing/scripts/send-outreach.mjs --send    # actually sends
//
// Reads marketing/outreach/approved.json. Only entries with "approved": true, a
// published business email, a "source" for that email, a subject and a body are
// sent. Sent entries get sentAt + resendId written back and one line is appended
// to marketing/LOG.md. Anyone listed in marketing/outreach/suppressed.txt is skipped.
//
// Env: RESEND_API_KEY (required for --send)
//      OUTREACH_MAILING_ADDRESS (required for --send; goes in every footer)
//      OUTREACH_WEEKLY_CAP (optional, default 5 sends per rolling 7 days)

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIST = join(root, "outreach", "approved.json");
const SUPPRESSED = join(root, "outreach", "suppressed.txt");
const LOG = join(root, "LOG.md");
const FROM = "Chris at Coffee Brew Coach <hello@coffeebrew.coach>";
const REPLY_TO = "hello@coffeebrew.coach";
const LINK = "https://www.coffeebrew.coach/affiliate/become";

const send = process.argv.includes("--send");
const cap = Number(process.env.OUTREACH_WEEKLY_CAP ?? 5);
const address = process.env.OUTREACH_MAILING_ADDRESS?.trim();
const apiKey = process.env.RESEND_API_KEY;

if (send && (!apiKey || !address)) {
  console.error("Refusing to send: RESEND_API_KEY and OUTREACH_MAILING_ADDRESS must both be set.");
  process.exit(1);
}

const data = JSON.parse(readFileSync(LIST, "utf8"));
const suppressed = new Set(
  existsSync(SUPPRESSED)
    ? readFileSync(SUPPRESSED, "utf8").split("\n").map(s => s.trim().toLowerCase()).filter(s => s && !s.startsWith("#"))
    : [],
);

const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
let sentThisWeek = data.entries.filter(e => e.sentAt && Date.parse(e.sentAt) > weekAgo).length;
let sentNow = 0;

const words = s => s.trim().split(/\s+/).length;
const problems = e => {
  const p = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email ?? "")) p.push("no valid email");
  if (!e.source) p.push("no source for the email address");
  if (!e.subject || words(e.subject) >= 8) p.push("subject missing or 8+ words");
  if (!e.body) p.push("no body");
  else {
    if (words(e.body) > 170) p.push("body over 170 words");
    if (!e.body.includes(LINK)) p.push("body missing affiliate link");
  }
  return p;
};

for (const e of data.entries) {
  if (e.sentAt || !e.approved) continue;
  const bad = problems(e);
  if (suppressed.has(e.email?.toLowerCase())) bad.push("suppressed");
  if (bad.length) { console.log(`SKIP ${e.id}: ${bad.join("; ")}`); continue; }
  if (sentThisWeek >= cap) { console.log(`HOLD ${e.id}: weekly cap of ${cap} reached`); continue; }

  const text = `${e.body.trim()}\n\n--\nIf you'd rather not hear from me again, just reply "no thanks" and I won't write again.\nCoffee Brew Coach · ${address ?? "[mailing address]"}\n`;
  if (!send) { console.log(`DRY ${e.id} -> ${e.email}\nSubject: ${e.subject}\n\n${text}`); sentThisWeek++; continue; }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: e.email, reply_to: REPLY_TO, subject: e.subject, text }),
  });
  if (!res.ok) { console.error(`FAIL ${e.id}: resend ${res.status}`); continue; }
  const { id } = await res.json();
  e.sentAt = new Date().toISOString();
  e.resendId = id ?? "";
  sentThisWeek++; sentNow++;
  writeFileSync(LIST, JSON.stringify(data, null, 2) + "\n");
  appendFileSync(LOG, `${e.sentAt.slice(0, 10)} · outreach · sent · ${e.id} · ${e.subject}\n`);
  console.log(`SENT ${e.id} -> ${e.email} (${id})`);
}
console.log(send ? `Done: ${sentNow} sent.` : "Dry run only. Nothing sent.");
