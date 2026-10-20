# 2026-10-20 · /espresso-pulling-too-fast · snippet and answer-first fix

**Summary:** /espresso-pulling-too-fast showed 702 impressions at position 8.3 with 1 click (0.14% CTR) in Sep 20 – Oct 17, the biggest click gap on the site and the page for our primary persona. It was last touched Sep 16, so it's outside the 21-day hold. I changed the title to "Espresso Pulling Too Fast? Grind Finer First", rewrote the meta description to state the answer (grind finer first, then dose, tamp, distribution, one change per shot), made the first paragraph under the H1 a direct answer, and added one FAQ ("still pulling too fast after I grind finer"), which flows into the FAQPage schema. The URL and body are unchanged and the sitemap lastmod is bumped to 2026-10-20. Expect CTR to move from 0.14% toward 1% or better over the next 2–3 weeks of data at similar position; it worked if clicks per 28 days rise from 1 to 5+ without position slipping below 10.

## What the data showed
- Page: 702 impressions, 1 click, position 8.32 (pages.csv, 2026-10-20).
- Queries: "espresso pulling too fast" 11 imp (pos 10.4), "shot pulling too fast" 11 (9.5), "coffee pulling too fast" 4, "espresso shot pulling too fast" 3, "espresso pull too fast" 2.
- Other candidates: /moka-pot (784 imp, 0.51%, pos 6.9) is the next-largest gap, held for a later week; /v60 and /aeropress sit at positions 21 and 35.

## What changed
- Title (44 chars before suffix): "Espresso Pulling Too Fast? Grind Finer First".
- Meta (≤155): "A shot that finishes in under 20 seconds is under-extracted. Grind finer first, then check dose, tamp and distribution, changing one thing per shot."
- Lead: opens with "Grind finer." and the one-line cause, then the order of checks.
- New FAQ: "My shot is still pulling too fast after I grind finer. What next?"
- Files: content-pages.ts, sitemap.ts only. No outcome claims, no café branding.

## Verification
pnpm install, `tsc -b`, api-server `tsc --noEmit` and `vitest run` (59 tests) all pass.

## How to tell if it worked
Re-pull Search Console after Nov 10. Compare page CTR and clicks against 0.14% / 1 click per 28 days, and confirm position stays ≤ 10.
