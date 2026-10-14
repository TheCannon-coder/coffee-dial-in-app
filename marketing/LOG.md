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
