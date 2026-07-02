import { Router } from "express";

const router = Router();

const BASE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=430, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300;1,9..144,500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{width:430px;height:932px;overflow:hidden}
  </style>
</head>
<body>`;

const CLOSE = `</body></html>`;

// ── Frame 1: Tasting ──────────────────────────────────────────────────────────
router.get("/screenshots/1", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`${BASE}
<div style="width:430px;height:932px;background:#2C1A0E;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:52px 28px 48px">

  <div style="text-align:center">
    <p style="font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:17px;color:#A89080;margin-bottom:12px">Coffee Brew Coach</p>
    <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:42px;line-height:1.1;color:#FAF7F2">Tell us how<br/>it tasted.</h1>
    <p style="font-family:'DM Sans',sans-serif;font-size:17px;color:#A89080;margin-top:12px">Get one clear fix. Every time.</p>
  </div>

  <div style="width:100%;background:#3D2410;border-radius:24px;padding:28px 20px">
    <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:13px;color:#A89080;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px">How did it taste?</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px">
      ${[
        ["Too bitter","#5C3A1E"],
        ["Flat / thin","#5C3A1E"],
        ["Too sour","#3D2410"],
        ["Weak","#3D2410"],
        ["Harsh","#5C3A1E"],
        ["Too strong","#3D2410"],
        ["Salty","#3D2410"],
        ["Muddy","#5C3A1E"],
      ].map(([label, bg]) =>
        `<div style="background:${bg};border-radius:100px;padding:10px 18px;font-family:'DM Sans',sans-serif;font-size:15px;color:#FAF7F2;font-weight:500">${label}</div>`
      ).join("")}
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:18px"></div>
    <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#A89080;margin-bottom:10px">Any other notes?</p>
    <div style="background:#2C1A0E;border-radius:12px;padding:14px;color:#6B5040;font-family:'DM Sans',sans-serif;font-size:14px">
      e.g. looked really dark, smelled smoky…
    </div>
    <div style="margin-top:20px;background:#FAF7F2;border-radius:100px;padding:18px;text-align:center;font-family:'DM Sans',sans-serif;font-weight:600;font-size:17px;color:#2C1A0E">
      Analyse my brew →
    </div>
  </div>

  <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#6B5040;text-align:center">No barista knowledge needed</p>
</div>
${CLOSE}`);
});

// ── Frame 2: Brew-along ───────────────────────────────────────────────────────
router.get("/screenshots/2", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`${BASE}
<div style="width:430px;height:932px;background:#1A100A;display:flex;flex-direction:column;padding:52px 28px 48px">

  <div style="margin-bottom:36px">
    <p style="font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:17px;color:#A89080;margin-bottom:12px">Coffee Brew Coach</p>
    <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:42px;line-height:1.1;color:#FAF7F2">Brew it right,<br/>every step.</h1>
    <p style="font-family:'DM Sans',sans-serif;font-size:17px;color:#A89080;margin-top:12px">Timed guides for every method.</p>
  </div>

  <div style="display:flex;gap:6px;margin-bottom:32px">
    ${[...Array(6)].map((_, i) =>
      `<div style="flex:1;height:4px;border-radius:2px;background:${i < 3 ? '#FAF7F2' : i === 3 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}"></div>`
    ).join("")}
  </div>

  <p style="font-family:'DM Sans',sans-serif;font-size:12px;color:#A89080;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Step 4 of 6 &nbsp;·&nbsp; V60</p>
  <p style="font-family:'Fraunces',serif;font-weight:500;font-size:36px;color:#FAF7F2;margin-bottom:16px">First pour</p>
  <p style="font-family:'DM Sans',sans-serif;font-size:18px;color:#D4C4B4;line-height:1.6;margin-bottom:36px">Continue pouring in slow circles to 150ml total. Keep it gentle and steady.</p>

  <div style="margin-bottom:32px">
    <p style="font-family:'Fraunces',serif;font-weight:300;font-size:72px;color:#FAF7F2;letter-spacing:2px">0:31</p>
    <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin-top:16px;overflow:hidden">
      <div style="width:31%;height:100%;background:#FAF7F2;border-radius:2px"></div>
    </div>
  </div>

  <div style="margin-top:auto;background:#FAF7F2;border-radius:100px;padding:18px;text-align:center">
    <p style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:17px;color:#2C1A0E">Wait for timer…</p>
  </div>
</div>
${CLOSE}`);
});

// ── Frame 3: Coffee diary ─────────────────────────────────────────────────────
router.get("/screenshots/3", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`${BASE}
<div style="width:430px;height:932px;background:#FAF7F2;display:flex;flex-direction:column;padding:52px 24px 48px">

  <div style="margin-bottom:32px">
    <p style="font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:17px;color:#8B6347;margin-bottom:12px">Coffee Brew Coach</p>
    <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:40px;line-height:1.1;color:#2C1A0E">Every coffee,<br/>remembered.</h1>
    <p style="font-family:'DM Sans',sans-serif;font-size:17px;color:#8B6347;margin-top:10px">Grouped by bean. Sorted by taste.</p>
  </div>

  ${[
    { name: "Ethiopian Yirgacheffe", method: "V60", adj: "Grind finer", count: 6, date: "Today" },
    { name: "Colombian Huila", method: "AeroPress", adj: "Leave as-is ✓", count: 4, date: "Jun 4" },
    { name: "Kenya AA Washed", method: "French press", adj: "Steep longer", count: 2, date: "Jun 2" },
    { name: "Brazil Cerrado", method: "Espresso", adj: "Grind coarser", count: 1, date: "May 30" },
  ].map(c => `
    <div style="background:#fff;border:1px solid #E8DDD4;border-radius:16px;padding:18px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:'Fraunces',serif;font-weight:500;font-size:17px;color:#2C1A0E">${c.name}</span>
          ${c.count > 1 ? `<span style="background:#F0E8DF;border-radius:100px;padding:2px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#2C1A0E;font-weight:500">${c.count}</span>` : ""}
        </div>
        <span style="font-family:'DM Sans',sans-serif;font-size:13px;color:#A89080">${c.date}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-family:'DM Sans',sans-serif;font-size:13px;color:#8B6347">${c.method}</span>
        <span style="background:#F0E8DF;border-radius:100px;padding:4px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#2C1A0E;font-weight:500">→ ${c.adj}</span>
      </div>
    </div>
  `).join("")}
</div>
${CLOSE}`);
});

// ── Frame 4: AI advice result ─────────────────────────────────────────────────
router.get("/screenshots/4", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`${BASE}
<div style="width:430px;height:932px;background:#2C1A0E;display:flex;flex-direction:column;align-items:center;padding:52px 28px 48px">

  <div style="text-align:center;margin-bottom:40px">
    <p style="font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:17px;color:#A89080;margin-bottom:12px">Coffee Brew Coach</p>
    <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:42px;line-height:1.1;color:#FAF7F2">One expert<br/>adjustment.</h1>
    <p style="font-family:'DM Sans',sans-serif;font-size:17px;color:#A89080;margin-top:12px">Based on how your cup tasted.</p>
  </div>

  <div style="width:100%;background:#3D2410;border-radius:24px;padding:28px;margin-bottom:20px">
    <p style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#A89080;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Your coaching</p>
    <p style="font-family:'Fraunces',serif;font-weight:500;font-size:22px;line-height:1.4;color:#FAF7F2;margin-bottom:20px">Your grind is too coarse for this Ethiopian — you're under-extracting, which is giving you that flat, sour edge. Try one step finer and keep everything else the same.</p>
    <div style="background:#2C1A0E;border-radius:100px;padding:12px 20px;display:inline-block">
      <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:15px;color:#FAF7F2">→ Grind one step finer</p>
    </div>
  </div>

  <div style="width:100%;display:flex;gap:12px">
    <div style="flex:1;background:#3D2410;border-radius:16px;padding:18px;text-align:center">
      <p style="font-family:'Fraunces',serif;font-size:28px;color:#FAF7F2">V60</p>
      <p style="font-family:'DM Sans',sans-serif;font-size:12px;color:#A89080;margin-top:4px">Method</p>
    </div>
    <div style="flex:1;background:#3D2410;border-radius:16px;padding:18px;text-align:center">
      <p style="font-family:'Fraunces',serif;font-size:28px;color:#FAF7F2">15g</p>
      <p style="font-family:'DM Sans',sans-serif;font-size:12px;color:#A89080;margin-top:4px">Dose</p>
    </div>
    <div style="flex:1;background:#3D2410;border-radius:16px;padding:18px;text-align:center">
      <p style="font-family:'Fraunces',serif;font-size:28px;color:#FAF7F2">2:45</p>
      <p style="font-family:'DM Sans',sans-serif;font-size:12px;color:#A89080;margin-top:4px">Time</p>
    </div>
  </div>

  <div style="margin-top:auto;width:100%;background:#FAF7F2;border-radius:100px;padding:18px;text-align:center">
    <p style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:17px;color:#2C1A0E">Save & brew again →</p>
  </div>
</div>
${CLOSE}`);
});

// ── Frame 5: Achievements ─────────────────────────────────────────────────────
router.get("/screenshots/5", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`${BASE}
<div style="width:430px;height:932px;background:#FAF7F2;display:flex;flex-direction:column;padding:52px 24px 48px">

  <div style="margin-bottom:36px">
    <p style="font-family:'Fraunces',serif;font-style:italic;font-weight:300;font-size:17px;color:#8B6347;margin-bottom:12px">Coffee Brew Coach</p>
    <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:40px;line-height:1.1;color:#2C1A0E">Level up<br/>your craft.</h1>
    <p style="font-family:'DM Sans',sans-serif;font-size:17px;color:#8B6347;margin-top:10px">Earn badges as you improve.</p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
    ${[
      { e: "🌱", t: "First Sip", earned: true },
      { e: "☕", t: "Getting Dialed", earned: true },
      { e: "🏠", t: "Home Barista", earned: true },
      { e: "🎯", t: "Perfectionist", earned: true },
      { e: "🗺️", t: "Method Explorer", earned: true },
      { e: "📐", t: "Consistent Cup", earned: true },
      { e: "🤓", t: "Coffee Nerd", earned: false },
      { e: "🌍", t: "Method Master", earned: false },
      { e: "🏆", t: "Master Brewer", earned: false },
    ].map(b => `
      <div style="background:${b.earned ? "#fff" : "#F0E8DF"};border:1px solid ${b.earned ? "#E8DDD4" : "transparent"};border-radius:14px;padding:16px 10px;text-align:center;opacity:${b.earned ? 1 : 0.45}">
        <div style="font-size:28px;margin-bottom:8px">${b.e}</div>
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:11px;color:#2C1A0E;line-height:1.3">${b.t}</p>
      </div>
    `).join("")}
  </div>

  <div style="background:#2C1A0E;border-radius:20px;padding:20px 24px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:15px;color:#FAF7F2">Brewing streak</p>
      <p style="font-family:'Fraunces',serif;font-size:22px;color:#FAF7F2">23 brews</p>
    </div>
    <div style="height:6px;background:rgba(255,255,255,0.12);border-radius:3px;overflow:hidden">
      <div style="width:23%;height:100%;background:#FAF7F2;border-radius:3px"></div>
    </div>
    <p style="font-family:'DM Sans',sans-serif;font-size:12px;color:#A89080;margin-top:8px">2 more brews to unlock Coffee Nerd</p>
  </div>
</div>
${CLOSE}`);
});

// ── OG image (1200×630 SVG) ──────────────────────────────────────────────────
router.get("/screenshots/og", (_req, res) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#2C1A0E"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#grain)" opacity="0.04"/>
  <defs>
    <pattern id="grain" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="1" height="1" fill="#FAF7F2"/>
    </pattern>
  </defs>

  <!-- Decorative arc -->
  <circle cx="1100" cy="-80" r="380" fill="none" stroke="#3D2410" stroke-width="80"/>
  <circle cx="1100" cy="-80" r="280" fill="none" stroke="#3D2410" stroke-width="40"/>

  <!-- Brand label -->
  <text x="80" y="130" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-style="italic" fill="#A89080" letter-spacing="1">Coffee Brew Coach</text>

  <!-- Headline -->
  <text x="80" y="260" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="bold" fill="#FAF7F2" letter-spacing="-2">Brew better</text>
  <text x="80" y="360" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="bold" fill="#FAF7F2" letter-spacing="-2">coffee.</text>

  <!-- Subline -->
  <text x="80" y="440" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#A89080">Describe how it tasted. Get one specific fix.</text>

  <!-- CTA pill -->
  <rect x="80" y="500" width="220" height="62" rx="31" fill="#FAF7F2"/>
  <text x="190" y="539" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="bold" fill="#2C1A0E" text-anchor="middle">Free for iOS</text>

  <!-- App Store star row -->
  <text x="330" y="539" font-family="Arial, sans-serif" font-size="22" fill="#A89080">★★★★★</text>
  <text x="488" y="539" font-family="Arial, sans-serif" font-size="18" fill="#6B5040">4.8 · 200+ ratings</text>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});

export default router;
