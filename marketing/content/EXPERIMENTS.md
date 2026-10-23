# Site experiments

One row per experiment. The Content/SEO agent checks this first every run: two
experiments may overlap in time only if their scopes don't overlap. A scope is
not touched again until its read date has passed and the result is filled in.

| Start | Scope | Change | Metric (where) | Baseline | Read date | Result |
|---|---|---|---|---|---|---|
| 2026-10-20 | /espresso-pulling-too-fast | Title "Grind Finer First", answer-first meta + lead, +1 FAQ | Page CTR and clicks (GSC pages.csv), position stays ≤ 10 | 702 imp, 1 click, 0.14%, pos 8.3 (Sep 20–Oct 17) | 2026-11-10 | |
| 2026-10-23 | /moka-pot | Title "Heat, Grind or Timing", meta cut to ≤155, action-first lead | Page CTR and clicks (GSC pages.csv), position ≤ 10 | 784 imp, 4 clicks, 0.51%, pos 6.9 (Sep 20–Oct 17) | 2026-11-13 | |
| 2026-10-23 | /v60 | Title "How to Brew V60", recipe meta, +2 FAQs (how to make, how much coffee) | Page position, impressions, clicks (GSC pages.csv) | 279 imp, 2 clicks, pos 21.2 (Sep 20–Oct 17) | 2026-11-13 | |
