# 2026-10-27 · /cold-brew · ratio-first title, meta, lead, FAQ

**Summary:** /cold-brew showed 258 impressions at position 23.2 with 1 click (0.39%) in Sep 26 – Oct 23. About 130 of those impressions come from ratio phrasings ("cold brew coffee ratio" 34, "cold brew ratio" 26, "cold brewing coffee ratio" 22, "cold brew water ratio" 8, plus a long tail) at positions 10–35. The page had the ratios in the body but no direct answer at the top and no FAQ. I changed the title to "Cold Brew Ratio: 1:4 Concentrate or 1:8 Ready to Drink", rewrote the meta to state both ratios, replaced the lead with the answer (ratio, grind, steep time), and added four FAQs (best ratio, water per cup, steep time, grind size) that feed the FAQPage schema. Body otherwise unchanged. Sitemap lastmod 2026-10-27.

- Scope: /cold-brew only. No overlap with open experiments (/espresso-pulling-too-fast, /moka-pot, /v60).
- Metric: page position, impressions, clicks (GSC pages.csv).
- Baseline: 258 imp, 1 click, 0.39%, pos 23.2 (Sep 26 – Oct 23).
- Read date: 2026-11-17. Worked if position improves to ≤ 15 or clicks per 28 days reach 4+.
- Result (read 2026-11-17): Oct 17 – Nov 13 pull: 686 imp, 4 clicks, 0.58%, pos 23.8. Clicks met the 4+ bar (baseline 1) but position did not improve (23.2 → 23.8). Ratio queries still sit at 35–50 ("cold brew ratio" 66 imp, pos 34.5), though the new FAQ phrasings pick up page-1 impressions ("cold brew ready to drink ratio" pos 4.2, "cold brew ratio and time" 6.2). Partial: more impressions and a few clicks on small counts, no ranking lift on the head terms. Not re-touching today; scope open.
- Verification: tsc -b, api-server tsc --noEmit, vitest (59 tests) pass.

## Not done
Nothing was read: open experiments read 2026-11-10 and 2026-11-13. /aeropress (182 imp, pos 39) already has steep-time content and FAQs; held, since a position of 39 is a ranking problem, not a snippet one.
