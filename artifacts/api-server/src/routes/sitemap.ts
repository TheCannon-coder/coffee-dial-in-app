import { Router } from "express";

const router = Router();

const TODAY = new Date().toISOString().split("T")[0];

const CONTENT_PAGES = [
  "/chemex",
  "/kalita-wave",
  "/moka-pot",
  "/cold-brew",
  "/drip-machine",
  "/why-does-my-coffee-taste-bitter",
  "/espresso-pulling-too-fast",
  "/coffee-grind-size-guide",
  "/how-to-dial-in-espresso",
  "/aeropress-too-weak",
  "/french-press",
];

router.get("/sitemap.xml", (_req, res) => {
  const contentEntries = CONTENT_PAGES.map(
    p => `  <url>
    <loc>https://www.coffeebrew.coach${p}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.coffeebrew.coach/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${contentEntries}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

router.get("/robots.txt", (_req, res) => {
  const txt = `User-agent: *
Allow: /

Sitemap: https://www.coffeebrew.coach/sitemap.xml`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(txt);
});

export default router;
