#!/usr/bin/env node
// Search Console pull for the marketing Scorecard. Node 18+, no npm deps.
//
//   GSC_SERVICE_ACCOUNT_JSON='{...service account key...}' node marketing/scripts/gsc.mjs
//   Optional: GSC_SITE_URL (default: sc-domain:coffeebrew.coach), GSC_DAYS (default 28)
//
// Writes marketing/data/gsc/YYYY-MM-DD-queries.csv and -pages.csv in the same
// columns as a manual Search Console export, plus -summary.json. Search Console
// data lags ~2–3 days, so the window ends 3 days ago.

import { createSign } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error("GSC_SERVICE_ACCOUNT_JSON is not set");
  process.exit(1);
}
const sa = JSON.parse(raw);
const SITE = process.env.GSC_SITE_URL ?? "sc-domain:coffeebrew.coach";
const DAYS = Number(process.env.GSC_DAYS ?? 28);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64({ alg: "RS256", typ: "JWT" }) +
    "." +
    b64({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const jwt = unsigned + "." + signer.sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`token exchange failed (${res.status}): ${JSON.stringify(body).slice(0, 200)}`);
  return body.access_token;
}

const token = await accessToken();
const api = async (path, init = {}) => {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

// Fail early with a useful message if the service account isn't on the property.
const sites = await api("/sites");
const have = (sites.siteEntry ?? []).map((s) => `${s.siteUrl} (${s.permissionLevel})`);
if (!(sites.siteEntry ?? []).some((s) => s.siteUrl === SITE)) {
  console.error(`Service account ${sa.client_email} can't see ${SITE}. It sees: ${have.join(", ") || "nothing"}.`);
  console.error("Add it in Search Console → Settings → Users and permissions (Restricted is enough).");
  process.exit(1);
}

const iso = (d) => d.toISOString().slice(0, 10);
const end = new Date(Date.now() - 3 * 86400000);
const start = new Date(end.getTime() - (DAYS - 1) * 86400000);
const range = { startDate: iso(start), endDate: iso(end) };

async function pull(dimension) {
  const body = await api(`/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    body: JSON.stringify({ ...range, dimensions: [dimension], rowLimit: 1000, dataState: "final" }),
  });
  return (body.rows ?? [])
    .map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const toCsv = (header, rows) =>
  [header, ...rows.map((r) => [csvCell(r.key), r.clicks, r.impressions, `${(r.ctr * 100).toFixed(2)}%`, r.position.toFixed(2)].join(","))].join("\n") + "\n";

const [queries, pages] = await Promise.all([pull("query"), pull("page")]);
const totals = (rows) => rows.reduce((t, r) => ({ clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions }), { clicks: 0, impressions: 0 });
const tq = totals(queries);

const today = iso(new Date());
mkdirSync("marketing/data/gsc", { recursive: true });
writeFileSync(`marketing/data/gsc/${today}-queries.csv`, toCsv("Top queries,Clicks,Impressions,CTR,Position", queries));
writeFileSync(`marketing/data/gsc/${today}-pages.csv`, toCsv("Top pages,Clicks,Impressions,CTR,Position", pages));
writeFileSync(
  `marketing/data/gsc/${today}-summary.json`,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      site: SITE,
      ...range,
      totals: { clicks: tq.clicks, impressions: tq.impressions, ctr: tq.impressions ? +(tq.clicks / tq.impressions).toFixed(4) : 0 },
      query_rows: queries.length,
      page_rows: pages.length,
      // Pages people see but don't click: the Scorecard's CTR watch-list.
      high_impressions_low_ctr: pages.filter((p) => p.impressions >= 100 && p.ctr < 0.01).map((p) => ({ page: p.key, impressions: p.impressions, ctr: p.ctr, position: +p.position.toFixed(1) })),
    },
    null,
    2,
  ),
);
console.log(`gsc ${range.startDate}..${range.endDate}: ${tq.clicks} clicks / ${tq.impressions} impressions across ${queries.length} queries, ${pages.length} pages`);
