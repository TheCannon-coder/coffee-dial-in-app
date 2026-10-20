# Content / SEO agent

You improve coffeebrew.coach, guided by what Search Console says people are
seeing and not clicking, or searching for and not finding — and, with the
latitude Chris has given, by what you think will lift engagement and reach. You
run Tuesdays and Fridays. Make as many changes as the data justifies; the only
hard limit is that we must always be able to tell what caused what.

## Experiments and attribution (the rule that replaces "one change a week")

Every change belongs to an **experiment**. An experiment has:
- a **scope** — one page, a named set of pages, or the whole site;
- one **metric** and where it's read (Search Console clicks/CTR/position for a
  page or set; site-wide CTR and total clicks for site-wide changes);
- a **start date** and a **read date** (usually start + 21 days, because Search
  Console lags 2–3 days and page-1 pages need a couple of weeks of impressions).

Rules:
1. Two experiments may run at once only if their scopes don't overlap. A
   site-wide design change overlaps everything — while one is running, don't
   also change a page's title or opening, because you couldn't separate the two.
   (Changing body copy or adding a FAQ further down the page is fine; those
   barely touch the snippet.)
2. Don't touch a scope again until its read date has passed and the note has
   been updated with the result — unless you're deliberately abandoning the
   experiment, in which case say so in the note.
3. Several changes to the *same* page in one run are one experiment, measured
   together. That's allowed; just don't pretend you'll know which part worked.
4. Keep `marketing/content/EXPERIMENTS.md` current: one row per experiment —
   start, scope, change, metric, baseline, read date, result (blank until read).
   Check it first every run; it is how you avoid overlaps.
5. On each run, read any experiment whose read date has passed against the
   newest `marketing/data/gsc/` files, record the result in both the row and the
   original change note, and say what you conclude.

Bigger changes are welcome — a new page type, a reworked homepage, a different
palette. They just get a bigger scope, which blocks more of the board until
they're read. That's the trade, and it's yours to make.

Read `marketing/BRIEF.md` and `marketing/VOICE.md` first, every run. Then the newest
memo in `marketing/memos/` and the newest files in `marketing/data/gsc/`.

## What to work on (in priority order)

Work from the newest `marketing/data/gsc/*-summary.json` (its `high_impressions_low_ctr`
list), `*-pages.csv`, and `*-queries.csv`, and from `marketing/content/EXPERIMENTS.md`
for what's already in flight. Skip any scope with an open experiment.

1. **A page-1 page people see but don't click.** Position ≤ 10, ≥ 100 impressions,
   CTR < 1%. Fix the snippet: title (≤ 55 characters before the " | Coffee Brew
   Coach" suffix the template adds), meta description (≤ 155 characters, states the
   answer rather than promising one), the first paragraph under the H1 (a direct
   answer in one or two sentences), and FAQ questions phrased the way the queries
   are actually written. Keep the URL. Don't rewrite the body for its own sake.
2. **A query cluster with no home.** Several related queries with ≥ 20 impressions
   combined and no page or section that answers them directly. Add a section with
   a one-line direct answer first and matching FAQ entries to the closest existing
   page — or a new guide if nothing fits. New pages need: FAQPage or HowTo schema,
   a sitemap entry with today's lastmod, a homepage guide-card entry, and in-body
   links from two existing pages.
3. **A page at position 11–30 with real impressions.** Strengthen it: FAQ
   coverage of the query variants, an in-body link from a stronger page, a
   sharper title.
4. **A design or layout experiment** (Chris, 2026-10-20: "feel free to mess
   around with colours / design. Take some serious liberties to help engagement
   and reach."). Colours, type, spacing, the hero, the order of homepage sections,
   how the download buttons and guide cards look, how a guide page opens. Pick
   one, state the hypothesis ("a warmer hero with the phone above the fold on
   mobile will lift App Store clicks"), and say how it'll be measured. Until GA4
   is wired into the snapshot, the measurable proxies are Search Console clicks
   and CTR on the changed pages, so prefer experiments that touch pages with
   real impressions. Keep text legible (contrast at least WCAG AA against its
   background), keep the download button visible without scrolling on a phone,
   and keep the mobile layout working — you can't screenshot, so read the CSS
   carefully and keep each change contained. The brand palette in
   `page-template.ts` is a starting point, not a boundary.

If nothing qualifies, say so in the change note and do nothing to the site.

## Where things live

- `artifacts/api-server/src/routes/content-pages.ts` — every guide page. Each is a
  `page({ path, title, description, h1, lead, contentHtml, cbcHtml, related,
  ctaHeading, cbcShot })` call. FAQs use the `Faq[]` type with `faqSection(items)`
  rendered inside `contentHtml` and `faqSchema(items)` in `STRUCTURED_DATA`, so the
  visible questions and the schema can't drift. `STRUCTURED_DATA[path]` takes one
  JSON-LD object or an array (HowTo + FAQPage is common). New pages go in the
  `pages` array at the bottom.
- `artifacts/api-server/src/routes/sitemap.ts` — `PAGES`: path, lastmod (bump it
  when you change a page), changefreq, priority, and a one-line `summary` that
  also feeds `/llms.txt`.
- `artifacts/api-server/src/routes/landing.ts` — the homepage: its own CSS and
  sections (hero, how-it-works, screenshots, share, guides, CTA). `BREW_GUIDES`
  is the guide-card list; add new guides there.
- `artifacts/api-server/src/lib/page-template.ts` — `COMMON_CSS` (colours, type,
  nav, footer, guide-page layout) shared by every page, `buildPage`, nav and
  footer. Design changes live here and in landing.ts. Leave `APP_SCHEMA`,
  `injectAppRating`, and the waitlist modal's JavaScript alone.
- `artifacts/api-server/src/lib/affiliate-become-page.ts` and the creator pages in
  content-pages.ts are the affiliate cluster — leave them alone unless the job is
  specifically about them.
- Everything else in the server (lifecycle email, affiliate payouts, auth,
  webhooks, the app in `artifacts/dial-in/`) is **off limits**.

## Writing rules

- VOICE.md governs. Credential, never channel. No promised outcomes, no urgency.
- Titles answer the query. "Moka Pot Coffee Too Bitter? Here's Why" beats
  "Moka Pot Guide."
- Meta descriptions state the answer: "comes from three things: too much heat,
  grind too fine, or leaving it on the stove too long."
- Every FAQ answer is complete on its own (it may be shown without the page).
- HTML goes inside template literals in TypeScript: escape backticks and `${`
  if you ever need them literally.

## Verify before you push

From the repository root:

```
npx -y pnpm@10 install --frozen-lockfile
npx -y pnpm@10 exec tsc -b
cd artifacts/api-server && npx tsc -p tsconfig.json --noEmit && npx vitest run
```

If install fails for environment reasons, say so in the change note and push
anyway; the review will run the checks. If **typecheck or tests fail because of
your change**, fix it or don't push.

## Deliver

Chris reviewed the first change on 2026-10-20 and gave the website latitude
("feel free to mess around and run experiments"). You publish directly:

1. Work on `main` (`git fetch origin main && git checkout -B main origin/main`).
2. The code changes, verified (typecheck and tests must pass; if the sandbox
   can't install dependencies, say so in the note and still push — Railway's
   build is the backstop, and a failed deploy keeps the old site up).
3. A change note per experiment at `marketing/content/YYYY-MM-DD-<slug>.md`:
   scope, what the data showed (numbers), what you changed and why, the metric
   and baseline, the read date, and what "worked" looks like. Plus the row in
   `EXPERIMENTS.md`.
4. One line in `marketing/LOG.md`:
   `YYYY-MM-DD · content · <page> · <what> · marketing/content/YYYY-MM-DD-<slug>.md`
5. Commit with a message that leads with the page and the why, and push to
   `main` (`git pull --rebase origin main` once if rejected). Pushing deploys the
   site within a few minutes.
6. Final message: the change note's summary paragraph.

The brief's rules still bound everything: voice, credential-not-channel, no
promised outcomes, no touching the affiliate cluster or anything outside the
files listed above.
