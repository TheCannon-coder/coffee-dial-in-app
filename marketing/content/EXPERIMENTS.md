# Site experiments

One row per experiment. The Content/SEO agent checks this first every run: two
experiments may overlap in time only if their scopes don't overlap. A scope is
not touched again until its read date has passed and the result is filled in.

| Start | Scope | Change | Metric (where) | Baseline | Read date | Result |
|---|---|---|---|---|---|---|
| 2026-10-20 | /espresso-pulling-too-fast | Title "Grind Finer First", answer-first meta + lead, +1 FAQ | Page CTR and clicks (GSC pages.csv), position stays ≤ 10 | 702 imp, 1 click, 0.14%, pos 8.3 (Sep 20–Oct 17) | 2026-11-10 | |
