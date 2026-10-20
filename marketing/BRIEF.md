# Coffee Brew Coach — Marketing Brief

Every marketing agent reads this before doing anything. If something here conflicts
with a task prompt, this wins. Keep it current: when a number, rule, or decision
changes, change it here first.

Owner: Chris Poirier. Review happens in a Claude Code session, ~1–2 hours/week.
Last updated: 2026-10-14.

---

## 1. Mission and north star

**North star: weekly active brewers** — distinct non-founder users who log at least
one brew in a 7-day window.

- Today: 2–6 per week, flat since August (3 in the last 7 days).
- 90-day target (to 2027-01-15): **20 per week**. Confirmed by Chris 2026-10-14.

Why this and not revenue: 136 signups (founder excluded), 48 have ever brewed,
0 paying Pro subscribers. Nobody converts to Pro who isn't brewing. Fix brewing first.

The three numbers the team moves, in order:
1. **Activation** — 88 of 136 signups (65%) have never logged a brew.
2. **Retention** — of the 48 who brewed, 27 brewed exactly once. 11 have brewed 3+.
3. **New signups** — 2–7 per week. Only matters once 1 and 2 are working.

---

## 2. The product

Coffee Brew Coach. Free iOS app (Android in 1–3 months). You describe how the cup
tasted — bitter, sour, weak, harsh — and it tells you the **one thing to change on
your next brew**. Grind finer. Steep 15 seconds less. Drop the dose half a gram.
Not a recipe, not a list of possibilities.

- Free: 10 coached brews a month, all methods, history of your last 3 brews.
- Pro: unlimited brews and history. **$4.99/month or $49.99/year** (USD and CAD
  carry the same figures; confirmed from App Store Connect 2026-10-15, proceeds
  85%). Monthly and yearly only — "lifetime" exists in the affiliate commission
  table but isn't sold in the app. **No intro offer or free trial is live** on
  either plan. (Internal reference names in App Store Connect still say "Dial In
  Pro" — cosmetic, not user-facing.)
- Also in the app: timed brew-along guides per method, per-coffee history with the
  next tweak remembered, a home-screen widget with today's plan, a morning reminder
  carrying the pending tweak, "give a month, get a month" referrals, and a cash
  affiliate program.
- Methods: espresso, V60, AeroPress, Chemex, Kalita Wave, French press, moka pot,
  cold brew, drip machine.
- Site: https://www.coffeebrew.coach — 20 pages: homepage, 14 method/troubleshooting
  guides, 3 creator/affiliate pages, affiliate signup, privacy/terms.
- App Store: id6777418888. Rating 5.0 (15 ratings), pulled live.

**Positioning line:** *It tells you the one thing to change on your next brew.*

---

## 3. Who it's for

**Primary — write everything for this person:** someone who recently got a home
espresso machine and whose shots taste wrong. They've watched the videos, they've
got a scale, and the coffee is still sour or bitter and they don't know which knob
to turn. They search "espresso pulling too fast," "why is my espresso sour,"
"moka pot bitter." A new machine is a known moment of pain; the gift-season spike
(January) is real.

**Secondary:** the V60 / AeroPress hobbyist. Bigger audience, cheaper gear, less
acute pain.

**A tension to hold honestly:** the espresso owner is the *acquisition* persona —
it's who searches for help and who the café-owner credential speaks to most
directly. But the people who actually use the app today are mostly pour-over
brewers. Excluding the founder's accounts: 29 users have logged V60 brews (5 active
in the last 28 days) against 11 for espresso (2 active) and 8 for AeroPress. Of
people whose *first* brew was V60, 6 of 26 reached a third brew; for espresso, 3 of
11 — about the same rate, and too few to call. So: write *acquisition* for the
espresso owner; write *activation and retention* for whoever shows up, and the
scorecard tracks both by method. If the espresso bet doesn't produce active brewers
within 90 days, revisit the primary persona.

**Not for:** people who want a recipe database, a bean marketplace, or a
scale-connected brewing instrument. We don't compete with Beanconqueror or Acaia;
we compete with "guessing."

---

## 4. Credibility: The Cannon is the credential, not the channel

Chris owns The Cannon, a café in Hamilton, Ontario, and dials in espresso there
every morning. That is the authority behind every diagnosis, and it's used in the
first person: *"I own a café. I've dialled this in a thousand mornings. Here's what
that bitterness is."*

**What that does not mean:** the app is kept at arm's length from the café.
- Never use The Cannon's customers, social accounts, email list, signage, or
  packaging to promote the app.
- Never describe the app as "by The Cannon," a Cannon product, or affiliated.
- The café's name may appear as biography ("café owner in Hamilton"), never as
  a brand partner or a call to action.

**The test for any sentence:** could a reader think The Cannon is the one talking?
If yes, rewrite it. Chris, as a person who owns a café, can speak. The café cannot.

The existing site wording ("Built by The Cannon" in the footer, creator in the
schema, "built by the team at The Cannon" on the homepage) stays as-is for now —
Chris's call, 2026-10-14. Don't extend it: no new copy in that register.

---

## 5. The numbers today (2026-10-14, from the production database)

All user-level numbers exclude the founder's accounts (4 accounts, 22 brews). This
is the same definition `marketing/scripts/funnel.mjs` uses, so the brief and the
weekly scorecard always agree. Anonymous (no-email) accounts are included — 18 of
them, and 17 have brewed.

| Metric | Value |
|---|---|
| Signups (all time) | 136 |
| Signups, last 30 days | 14 |
| Ever brewed | 48 (35%) |
| Never brewed | 88 (65%) |
| Brewed exactly once | 27 |
| Brewed 3+ times | 11 |
| Weekly active brewers (7d) | 3 |
| Monthly active brewers (28d) | 8 |
| Brews, all time | 133 |
| Pro subscribers | 0 paying (founder is comped) |
| Referral conversions | 0 |
| Affiliates | 0 besides the founder |
| Android waitlist | 3 |
| "Was this helpful?" | 28 yes / 5 no / 100 unrated (85% yes when rated) |
| Lifecycle audiences | 88 never brewed (82 of them signed up 30+ days ago) · 27 brewed once · 42 lapsed 14+ days |

Weekly active brewers, last 12 complete weeks (Jul 27 → Oct 5): 2, 2, 5, 3, 2, 6, 2, 4, 3, 2, 4 — flat, no trend.
Signup cohorts, last 8 weeks: 1, 4, 0, 7, 3, 2, 3 signups; of the 20 who signed up
since Aug 24, 14 brewed at least once and 1 reached a third brew.

App Store (Jun 10 – Sep 7): 5.02K impressions → 3.39K page views → 197 downloads.
**Page conversion 1.00% vs. 1.38% Food & Drink median — the leak for cold traffic.**
Search/Browse ≈ 1 view/day each (no ASO presence yet).

Search Console (Aug 17 – Sep 13): ~2.9K impressions, ~20 clicks, 0.7% CTR.
Impressions doubled over the window; clicks flat. Best page:
/best-affiliate-programs-for-coffee-creators (12 of 20 clicks). /moka-pot ranks
~8 with 0% CTR (fixed Sep 16 — FAQ/HowTo schema, answer-first meta; re-measure).

`acquisition_source` ("how'd you find us?" at onboarding) is unset for all 140
users because the question was committed on 2026-09-16, two days after the 1.2.8
build that's live on the App Store. It ships with the next release; until then
there is no source attribution. Don't read anything into the empty column.

---

## 6. What's been tried, and what we learned

- **Reddit ads** (CA$515, Aug 12–21): ~3K page views, ~25–30 installs, very low
  activation. Cold paid traffic hits the 1% App Store page and bounces. Don't
  repeat until the page converts.
- **SEO guide cluster** (Jul 31 → Sep 16): 14 guides with HowTo/FAQ schema. Worked
  for visibility (impressions 2x), not yet for clicks. The affiliate comparison
  pages outperform the brewing guides.
- **Affiliate program** (self-serve, live): page rewritten Sep 17 with real rates,
  calculator, no waitlist. Zero affiliates besides the founder. Nobody has been
  asked yet.
- **Friend referral** ("give a month, get a month"): 0 conversions ever. The code
  dies crossing the App Store install; share copy now puts the code in the text.
  Deferred deep linking would fix it properly.
- **TikTok:** 1–2 announcement posts. **Instagram** @coffeebrewcoach exists, quiet.
- **Email to users:** none yet. Resend is wired (hello@/support@coffeebrew.coach);
  transactional and affiliate emails work. No lifecycle sequence exists. This is
  the biggest untouched lever for the north star.
- **Paywall rebuild** (Sep 14, "Hormozi pass"): value stack, rating chip, risk
  reversal, referral decline path. Not yet measurable — too few brewers reach it.

---

## 7. Channels and assets the team may use

| Channel | State | Who acts |
|---|---|---|
| Lifecycle email (Resend) | Wired, no sequences yet | Agent sends 1:1 and broadcasts (see §9) |
| Website + guides | Live, code in this repo | Agent publishes |
| @coffeebrewcoach Instagram | Exists, quiet | Agent drafts captions + branded graphics; **Chris posts** |
| TikTok | 1–2 posts | Same as Instagram |
| App Store listing | Live; ASO pack in `artifacts/dial-in/store/aso.md` | Agent proposes; Chris submits |
| Affiliate program | Live, self-serve | Agent builds prospect list + drafts; **Chris sends** |
| In-app share surfaces | Referral code on every share | App changes: agent proposes, Chris ships |
| Android waitlist | 3 emails | Hold until launch is scheduled. Play listing copy stays consistent with the App Store copy — no new positioning for Android |
| **The Cannon's channels** | — | **Off limits** (§4) |

Social posting moves to a scheduler (Buffer/Later) once the drafts-then-Chris-posts
loop is working. Direct Instagram/TikTok API posting is not set up.

Data the team reads: production Postgres (read-only), Search Console (CSV export
today; API pending), GA4 (G-TJQQ53PBTE), App Store Connect (API working as of
2026-10-15; analytics reports not yet wired into the snapshot), Resend analytics,
RevenueCat.

---

## 8. Voice

Full reference: Claude memory `chris-voice.md`. The short version:

- **Casual-warm neighbour, not brand-speak.** Short sentences. Contractions. First
  person, talking to one person. Lead with the point.
- **Honesty over hype.** Say what the app does. Prices and terms stated straight.
- **Wit budget: one light line per piece.** Clever loses to clear every time.
- **No swearing, even mild.** "Heck," not "hell."
- **Register by surface:**
  - Site and broadcast email: warm but tidy. One ":)" max. No caps lock.
  - 1:1 email: warmer. Several ":)" fine, exclamation marks fine, zero wit.
    Gratitude at both ends. Never re-offer something someone declined.
  - Instagram/TikTok: looser. 🙏 and ":)" are his; multiple "!!" allowed; one
    doubled phrase for emphasis ("huge huge") per piece; direct questions to the
    audience, meant sincerely.
- **Sign-off:** "— Chris".
- **Privacy:** chris@cannoncoffeeco.com never appears anywhere public. Public
  contact for the app is hello@coffeebrew.coach / support@coffeebrew.coach.
  Private biography from the voice file is not for publication without asking.

---

## 9. Rules of engagement

**The team may do without asking:**
- Send 1:1 lifecycle emails to individual users.
- Send broadcasts to the user list.
- Publish website content and design (new guides, copy, titles, page types,
  openings, colours, type, layout) — commit and push. Chris has few opinions
  about the website and asked for "serious liberties" to help engagement and
  reach; one measurable change at a time, each with a note saying what "worked"
  looks like.
- Quote the app's numbers publicly **as shares or percentages**, never raw counts.

**Guardrail on the above:** the *first instance of any new type* of email or page
(a new sequence step, a new page template, a new broadcast format) gets one review
in the Monday session. After Chris has seen the type once, that type is autonomous.
Every send and every publish is logged in `marketing/LOG.md`.

**Needs a yes first:**
- Spending any money. Budget is $0 by default; up to CA$250/month is available
  when the team makes a specific case in the memo (which lever, expected effect,
  how we'll know).
- Social posts (agent drafts; Chris posts).
- Creator and affiliate outreach (agent drafts; Chris sends).
- App copy, pricing, offers, trials, promo codes.
- Anything that mentions The Cannon beyond the credential line in §4.
- Replying to inbound support or press.

**Never, even if it would move the number:**
- Countdowns, fake scarcity, or urgency theatre. "Ends tonight" only if it does.
- Promised outcomes. No "dialled in within 3 shots," no specific result claims.
- Building or shipping the app. Chris runs releases.
- Publishing the founder's private email or private biography.
- Using The Cannon's channels or customers.

Autonomy expands the same way it did for pushing code: one gate at a time, after
the output has been right a few times.

---

## 10. The team

Each agent has one job, one output, and reads this brief first. They run as
scheduled Claude Code routines against this repo and append to `marketing/LOG.md`.

| Agent | Cadence | Reads | Produces | Autonomy |
|---|---|---|---|---|
| **Scorecard** | Monday 11:00 UTC (snapshot Sunday 23:17) | Funnel snapshot, GSC pull, LOG, memos | One-page memo: what moved, why, the week's one recommendation, decisions waiting | Read-only |
| **Lifecycle** | Hourly tick in the API server | Postgres | Never-brewed nudge (recent + older variants) — live since 2026-10-14; next templates need copy approval | Sends after type approval |
| **Content / SEO** | Tuesday 11:00 UTC | GSC pull, memo, site code | One verified site improvement a week, pushed to main, with a change note (`marketing/content/`) | Direct to main (Chris, 2026-10-20: "few opinions on the website, feel free to run experiments") |
| **Social** | Wednesday 11:00 UTC | Memo, GSC queries, LOG | 5 posts: captions, SVG cards, alt text in `marketing/social/YYYY-MM-DD/` | Drafts only; Chris posts |
| **Creator outreach** | Thursday 11:00 UTC check; produces every ≥10 days | Affiliate page, earlier rounds | 5 creators + draft notes in `marketing/outreach/` | Drafts only; Chris sends |

All agents read `marketing/VOICE.md` before writing anything public.

Paid acquisition has no agent. It gets proposed in the Scorecard memo when there's
a case for it.

### Build order and status
1. **Scorecard** — live since 2026-10-14. Funnel + Search Console wired.
2. **Lifecycle** — never-brewed nudge live since 2026-10-14 (88 sent by 10-19).
   Next templates (post-first-brew check-in, "was the fix better?", free-limit → Pro)
   need copy approval first.
3. **Content / SEO** — built 2026-10-20; first run reviewed on a branch.
4. **Social** — built 2026-10-20.
5. **Creator outreach** — built 2026-10-20.

---

## 11. Decisions log

Answered 2026-10-14:
1. 90-day target: 20 weekly active brewers by 2027-01-15. **Confirmed.**
2. Prices: pulled from App Store Connect (§2).
3. The Cannon wording on the site stays as-is; the rule is in §4 — nothing may read
   as The Cannon speaking.
4. `acquisition_source` is empty because the question isn't in the shipped build (§5).
5. Android listing copy stays consistent with the App Store copy (§7).

Open: none. Add new questions here as they come up; the Scorecard agent surfaces
them in the Monday memo.
