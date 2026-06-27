import { Router } from "express";

const router = Router();

router.get("/sitemap.xml", (_req, res) => {
  const now = new Date().toISOString().split("T")[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://coffeebrew.coach/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://coffeebrew.coach/api/privacy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://coffeebrew.coach/api/terms</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

router.get("/robots.txt", (_req, res) => {
  const txt = `User-agent: *
Allow: /
Disallow: /api/admin
Disallow: /api/dialin
Disallow: /api/user

Sitemap: https://coffeebrew.coach/sitemap.xml`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(txt);
});

export default router;
