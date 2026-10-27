# Marketing log

Append-only. Every agent run, send, publish, and decision goes here, newest at the
bottom. Format: `YYYY-MM-DD · agent · what happened · link/ref`. Decisions from the
Monday session are recorded by the Scorecard agent as `decision:` lines.

---

2026-10-14 · setup · Brief written (marketing/BRIEF.md). Baseline: 140 signups,
51 ever brewed, 3 weekly active brewers, 0 paying Pro. North star = weekly active
brewers. Build order: Scorecard → Lifecycle → Content/SEO → Social → Creator outreach.
2026-10-14 · setup · decision: 90-day target = 20 weekly active brewers by 2027-01-15.
2026-10-14 · setup · Read-only Postgres role `marketing_ro` created on Neon for the
agents (SELECT only; verified writes are refused). Connection string lives in the
local .env and the Claude cloud environment as MARKETING_DATABASE_URL — never in the repo.
2026-10-14 · setup · App Store Connect API refused: FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED.
Chris to check ASC → Agreements, Tax, and Banking. ASC metrics join the scorecard once cleared.
2026-10-14 · setup · Scorecard agent instructions + funnel script added
(marketing/agents/scorecard.md, marketing/scripts/funnel.mjs).
2026-10-14 · scorecard · memo written · marketing/memos/2026-10-14.md
2026-10-14 · setup · decision: build the never-brewed nudge server-side; Chris approves copy before the first send.
2026-10-14 · lifecycle · Sender built and shipped DARK (LIFECYCLE_EMAILS unset): never_brewed template
(variants recent/older), lifecycle_sends table, email_opt_out + /email/unsubscribe, /open hand-off page,
admin preview/send-test/run. Draft copy: marketing/email/never-brewed-nudge.md. Awaiting: copy approval,
EMAIL_POSTAL_ADDRESS, then LIFECYCLE_EMAILS=true on Railway.
2026-10-14 · lifecycle · decision: never-brewed nudge copy APPROVED by Chris (subject "Still got a cup you
don't love?"). [TEST] send to Chris's inbox. Still waiting on EMAIL_POSTAL_ADDRESS before go-live.
2026-10-14 · lifecycle · decision: footer address = café street address without the café name (Chris).
2026-10-14 · lifecycle · LIVE. EMAIL_POSTAL_ADDRESS + LIFECYCLE_EMAILS=true set on Railway 15:33 UTC.
First tick 15:38 UTC: never_brewed/recent sent to 6 (all accepted by Resend, 0 failed). 0 recent
recipients remain. Variant older (82 people) stays OFF until the 2026-10-19 scorecard is read.
Measure: brews within 7 days of send vs. the recent never-brewed baseline; unsubscribes.
2026-10-15 · setup · Chris signed the pending App Store Connect agreements; ASC API unblocked.
Store facts confirmed: $4.99/mo, $49.99/yr (US+CA), no intro offer, no lifetime SKU. Brief §2 fixed
(had $44.99 from the paywall fallback; fallback corrected in app for the next build).
2026-10-15 · setup · Monday snapshot workflow (.github/workflows/marketing-funnel.yml) is on GitHub —
pushed by a one-off cloud session under the Claude GitHub App (the local token can't push workflow
files). Repo secret MARKETING_DATABASE_URL is set. Scorecard routine now syncs to origin/main first.
2026-10-19 · scorecard · memo written · marketing/memos/2026-10-19.md
2026-10-19 · setup · The snapshot Action's first scheduled run fired 16:43 UTC — 6h43m late (GitHub
cron slip on a new workflow) — so the 11:07 memo used the Oct 14 snapshot. Fix: Action moved to
Sunday 23:17 UTC. Fresh 10-19 snapshot: WAB 4 (was 3), MAB 12 (was 8), brews/7d 6, signups 138.
2026-10-19 · lifecycle · Nudge read at day 5: 6 sent, 0 brewed within window so far, 0 unsubscribed,
0 failed. Window closes 2026-10-21. Variant older (86 people now) decision pending with Chris.
2026-10-19 · lifecycle · decision (Chris): send variant older to all 82 emailable recipients now.
LIFECYCLE_NEVER_BREWED_OLDER=true on Railway; 25 per hourly tick inside the 13–22 UTC window, so
all 82 go out by ~22:00 UTC today. Next Monday's memo reads the whole group at once.
2026-10-19 · lifecycle · Variant older COMPLETE: 82 sent 18:59–21:54 UTC (25/tick), 0 failed, 0 eligible
remain. Total nudged to date: 88 (6 recent on 10-14, 82 older on 10-19). Read on 2026-10-26 memo:
brews within 7 days per variant, unsubscribes.
2026-10-20 · setup · Search Console API wired: service account search-console-reader (Restricted on the
coffeebrew.coach Domain property) → marketing/scripts/gsc.mjs → marketing/data/gsc/<date>-{queries,pages}.csv
+ -summary.json, run by the Sunday Action once the GSC_SERVICE_ACCOUNT_JSON secret is in GitHub.
First pull (Sep 20 – Oct 17): see marketing/data/gsc/2026-10-20-summary.json. /moka-pot still has the
biggest CTR gap (784 impressions, 0.5% CTR at position 6.9); /v60 climbed from ~49 to ~21.
2026-10-20 · setup · Sunday workflow tested end-to-end by a manual run (13:22 UTC): funnel snapshot +
Search Console pull both succeeded with the GitHub secrets; the Action committed fa26c98 on its own.
Monday 2026-10-26 memo will have same-week funnel numbers and 28 days of search data.
2026-10-20 · social · 5 drafts · marketing/social/2026-10-20/
2026-10-20 · content · /espresso-pulling-too-fast · title, meta, answer-first lead, +1 FAQ (702 imp, 0.14% CTR, pos 8.3) · branch content/2026-10-20-espresso-too-fast (awaiting review)
2026-10-20 · decision (Chris) · Content change to /espresso-pulling-too-fast reviewed and MERGED (ddbc315);
Chris has few opinions on the website and welcomes experiments → Content/SEO now publishes direct to main.
2026-10-20 · decision (Chris) · Social "honest numbers" must be shares/percentages, never raw counts.
Post 3 of 2026-10-20 rewritten accordingly. First Social and Content runs otherwise approved as-is.
2026-10-20 · decision (Chris) · Social skips the 2026-10-21 run; next drafts 2026-10-28 (gate at the top of
marketing/agents/social.md, self-removing).
2026-10-20 · decision (Chris) · Website design latitude: "feel free to mess around with colours / design.
Take some serious liberties to help engagement and reach." Content/SEO may change COMMON_CSS and the
homepage layout — one measurable change a week, with a stated hypothesis and measurement.
2026-10-20 · content · /espresso-pulling-too-fast change confirmed live (new title in production).
2026-10-20 · decision (Chris) · The website may change bigger and faster than one change a week, "as long
as we can rest assured that we're not mixing up causation." Rule: every change belongs to an experiment
with a scope, one metric, and a read date; scopes don't overlap while open (marketing/content/EXPERIMENTS.md).
Content/SEO now runs Tuesday + Friday.
2026-10-20 · outreach · First run produced nothing — correctly: the cloud sandbox can search but can't open
pages, so it refused to invent follower counts or contacts. outreach.md now works from search snippets,
defaults contact to a platform DM, and flags what Chris should verify before sending.
2026-10-20 · outreach · 5 drafts · marketing/outreach/2026-10-20.md
2026-10-23 · content · /moka-pot · shorter meta, new title, action-first lead · marketing/content/2026-10-23-moka-pot-snippet.md
2026-10-23 · content · /v60 · how-to title, recipe meta, +2 FAQs · marketing/content/2026-10-23-v60-snippet-faq.md
2026-10-26 · scorecard · memo written · marketing/memos/2026-10-26.md
2026-10-27 · content · /cold-brew · ratio-first title, meta, lead, +4 FAQs · marketing/content/2026-10-27-cold-brew-ratio.md
