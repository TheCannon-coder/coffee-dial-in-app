import { Router } from "express";

const router = Router();

const BASE = "https://www.coffeebrew.coach";

// lastmod must reflect when the page content actually changed — stamping every
// URL with the current date teaches crawlers to ignore the field. Bump a page's
// date when its content is edited.
const PAGES: Array<{
  path: string;
  lastmod: string;
  changefreq: "weekly" | "monthly";
  priority: string;
  // One-line summary used by /llms.txt. Pages without it are sitemap-only.
  summary?: string;
}> = [
  { path: "/", lastmod: "2026-07-31", changefreq: "weekly", priority: "1.0",
    summary: "Coffee Brew Coach — an iOS app that diagnoses why your coffee tastes wrong and gives one specific fix per brew." },
  { path: "/affiliate/become", lastmod: "2026-07-09", changefreq: "monthly", priority: "0.7",
    summary: "Recurring-commission affiliate program for coffee content creators." },
  { path: "/espresso", lastmod: "2026-07-31", changefreq: "monthly", priority: "0.8",
    summary: "Beginner's guide to making espresso at home — equipment, an 18 g in / 36 g out starting recipe, and adjusting by taste." },
  { path: "/how-to-dial-in-espresso", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Step-by-step espresso dialling-in: grind first, then dose, guided by taste." },
  { path: "/espresso-pulling-too-fast", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Why espresso shots run under 20 seconds and the fix order: grind, dose, tamp, distribution." },
  { path: "/v60", lastmod: "2026-07-31", changefreq: "monthly", priority: "0.8",
    summary: "V60 brewing guide — 15 g to 250 g recipe, pour technique, and fixes for bitter, sour, or stalled brews." },
  { path: "/aeropress", lastmod: "2026-07-31", changefreq: "monthly", priority: "0.8",
    summary: "AeroPress guide — standard and inverted methods, 16 g to 220 g recipe, espresso-style concentrate." },
  { path: "/aeropress-too-weak", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Four causes of weak AeroPress coffee: ratio, grind, steep time, water temperature." },
  { path: "/chemex", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Chemex brewing guide — 30 g to 500 g recipe, thick-filter behaviour, and common fixes." },
  { path: "/kalita-wave", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Kalita Wave guide — flat-bottom brewing, 20 g to 300 g recipe, troubleshooting." },
  { path: "/french-press", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "French press guide — coarse grind, 4-minute steep, and fixes for bitter, weak, or muddy cups." },
  { path: "/moka-pot", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Why moka pot coffee turns bitter — heat, grind, and timing — and how to fix it." },
  { path: "/cold-brew", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Cold brew ratios (concentrate vs. ready-to-drink), grind size, and steep times." },
  { path: "/drip-machine", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Better drip machine coffee: ratio, water temperature, fresh grinding, and machine cleaning." },
  { path: "/why-does-my-coffee-taste-bitter", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Bitter coffee is over-extraction — causes and fixes for every brew method." },
  { path: "/coffee-grind-size-guide", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Grind size chart for every method, from Turkish to cold brew, with taste-based calibration." },
  { path: "/how-coffee-youtubers-make-money", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "How coffee creators monetize: sponsorships, gear affiliates, ads, and recurring commissions." },
  { path: "/best-affiliate-programs-for-coffee-creators", lastmod: "2026-07-06", changefreq: "monthly", priority: "0.8",
    summary: "Comparison of affiliate program models for coffee content creators." },
];

router.get("/sitemap.xml", (_req, res) => {
  const entries = PAGES.map(
    p => `  <url>
    <loc>${BASE}${p.path}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

router.get("/robots.txt", (_req, res) => {
  const txt = `User-agent: *
Allow: /

Sitemap: ${BASE}/sitemap.xml`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(txt);
});

// llms.txt — a plain-markdown site overview for AI crawlers and assistants.
// Spec: https://llmstxt.org
router.get("/llms.txt", (_req, res) => {
  const guideLines = PAGES.filter(p => p.summary && p.path !== "/")
    .map(p => `- [${BASE}${p.path}](${BASE}${p.path}): ${p.summary}`)
    .join("\n");

  const txt = `# Coffee Brew Coach

> Coffee Brew Coach is a free iOS app (Android coming soon) that diagnoses why
> your coffee tastes wrong. You describe the taste — bitter, sour, weak, harsh —
> and it gives you one specific fix for the next brew: grind finer, steep less,
> lower the temperature. It supports espresso, V60, AeroPress, Chemex, Kalita
> Wave, French press, moka pot, cold brew, and drip machines, and keeps a brew
> history per bean. Built by The Cannon, a working coffee bar in Hamilton,
> Ontario. App Store: https://apps.apple.com/app/id6777418888

## Brewing guides

${guideLines}

## Contact

- Support: support@coffeebrew.coach
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(txt);
});

export default router;
