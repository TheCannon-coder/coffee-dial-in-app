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
