# Site experiments

One row per experiment. The Content/SEO agent checks this first every run: two
experiments may overlap in time only if their scopes don't overlap. A scope is
not touched again until its read date has passed and the result is filled in.

| Start | Scope | Change | Metric (where) | Baseline | Read date | Result |
|---|---|---|---|---|---|---|
| 2026-10-20 | /espresso-pulling-too-fast | Title "Grind Finer First", answer-first meta + lead, +1 FAQ | Page CTR and clicks (GSC pages.csv), position stays ≤ 10 | 702 imp, 1 click, 0.14%, pos 8.3 (Sep 20–Oct 17) | 2026-11-10 | Read 2026-11-10: 992 imp, 1 click, 0.10%, pos 7.9 (Oct 10–Nov 6). Clicks flat, CTR no lift, position held ≤ 10. Did not work; scope open for a new experiment. |
| 2026-10-23 | /moka-pot | Title "Heat, Grind or Timing", meta cut to ≤155, action-first lead | Page CTR and clicks (GSC pages.csv), position ≤ 10 | 784 imp, 4 clicks, 0.51%, pos 6.9 (Sep 20–Oct 17) | 2026-11-13 | Read 2026-11-13 (Oct 10–Nov 6 pull, about half post-change): 540 imp, 4 clicks, 0.74%, pos 7.2. CTR up from 0.51% but clicks flat, under the 10-click bar. Not worked; counts too small to call. Scope open. |
| 2026-10-23 | /v60 | Title "How to Brew V60", recipe meta, +2 FAQs (how to make, how much coffee) | Page position, impressions, clicks (GSC pages.csv) | 279 imp, 2 clicks, pos 21.2 (Sep 20–Oct 17) | 2026-11-13 | Read 2026-11-13 (Oct 10–Nov 6 pull, about half post-change): 309 imp, 3 clicks, pos 22.7. Position not better than 21.2, clicks under the 5 bar. Not worked; scope open. |
| 2026-10-27 | /cold-brew | Ratio-first title, meta, lead; +4 FAQs with schema | Page position, impressions, clicks (GSC pages.csv) | 258 imp, 1 click, 0.39%, pos 23.2 (Sep 26–Oct 23) | 2026-11-17 | |
| 2026-10-30 | /aeropress | Recipe-first title and meta, recipe lead, +tips section, +3 FAQs | Page position, impressions, clicks (GSC pages.csv) | 182 imp, 0 clicks, pos 39.4 (Sep 26–Oct 23) | 2026-11-20 | |
