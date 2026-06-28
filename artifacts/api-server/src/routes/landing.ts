import { Router } from "express";
import { APP_SCHEMA, COMMON_CSS, DOWNLOAD_BTNS, WAITLIST_MODAL, renderFooter, renderNav } from "../lib/page-template.js";

const router = Router();

const BREW_GUIDES = [
  { href: "/how-to-dial-in-espresso", label: "How to dial in espresso at home" },
  { href: "/espresso-pulling-too-fast", label: "Espresso pulling too fast — how to fix it" },
  { href: "/aeropress-too-weak", label: "AeroPress coffee too weak — fix it" },
  { href: "/chemex", label: "How to brew Chemex coffee" },
  { href: "/kalita-wave", label: "Kalita Wave brewing guide" },
  { href: "/moka-pot", label: "Moka pot coffee too bitter — fix it" },
  { href: "/cold-brew", label: "Cold brew coffee ratio guide" },
  { href: "/drip-machine", label: "Drip coffee maker tips" },
  { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
  { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
];

const guideCards = BREW_GUIDES.map(
  g =>
    `<a class="guide-card" href="${g.href}">
      <span class="guide-card-label">${g.label}</span>
      <svg class="guide-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </a>`,
).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Coffee Brew Coach — Coffee Coaching App for Espresso &amp; Pour Over</title>
  <meta name="description" content="Coffee Brew Coach tells you exactly why your coffee tastes wrong and gives you one specific fix. Free app for espresso, V60, AeroPress, French press and more." />
  <meta name="keywords" content="coffee coaching app, coffee brew coach, espresso dialling in, pour over guide, coffee taste fix, coffee brewing app, espresso pull, V60 guide" />
  <link rel="canonical" href="https://www.coffeebrew.coach/" />
  <meta name="robots" content="index, follow" />
  <meta name="apple-itunes-app" content="app-id=6777418888" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.coffeebrew.coach/" />
  <meta property="og:title" content="Coffee Brew Coach — Coffee Coaching App" />
  <meta property="og:description" content="Describe your brew. Get one specific fix. Better coffee on the next cup. Free for iOS and Android." />
  <meta property="og:image" content="https://www.coffeebrew.coach/screenshots/og" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Coffee Brew Coach" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Coffee Brew Coach — Coffee Coaching App" />
  <meta name="twitter:description" content="Describe your brew. Get one specific fix. Better coffee on the next cup." />
  <meta name="twitter:image" content="https://www.coffeebrew.coach/screenshots/og" />

  <script type="application/ld+json">${JSON.stringify(APP_SCHEMA)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300;1,9..144,500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>
    ${COMMON_CSS}

    /* ── Hero ─── */
    .hero {
      background: #2C1A0E;
      padding: 48px 24px 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .hero-eyebrow {
      font-family: 'Fraunces', Georgia, serif;
      font-style: italic;
      font-weight: 300;
      font-size: 13px;
      color: #A89080;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .hero h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-weight: 500;
      font-size: clamp(30px, 7vw, 56px);
      line-height: 1.1;
      color: #FAF7F2;
      max-width: 700px;
      margin-bottom: 18px;
    }
    .hero-sub {
      font-size: 18px;
      line-height: 1.65;
      color: #A89080;
      max-width: 420px;
      margin-bottom: 36px;
    }
    .hero-fine {
      font-size: 13px;
      color: #6B5040;
      margin-top: 14px;
    }

    /* ── How it works ─── */
    .hiw {
      background: #FAF7F2;
      padding: 72px 24px;
    }
    .hiw-inner { max-width: 860px; margin: 0 auto; }
    .section-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #A89080;
      text-align: center;
      margin-bottom: 48px;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 40px;
    }
    .step-num {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 40px;
      font-weight: 500;
      color: #E0D5C8;
      line-height: 1;
      margin-bottom: 12px;
    }
    .step h3 {
      font-family: 'Fraunces', Georgia, serif;
      font-weight: 500;
      font-size: 22px;
      color: #2C1A0E;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    .step p { font-size: 15px; line-height: 1.75; color: #6B4226; }

    /* ── Brew methods ─── */
    .methods {
      background: #1A100A;
      padding: 64px 24px;
      text-align: center;
    }
    .methods .section-label { color: #6B5040; }
    .methods-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      max-width: 680px;
      margin: 0 auto;
    }
    .method-pill {
      background: #2C1A0E;
      border: 1px solid #3D2410;
      border-radius: 100px;
      padding: 8px 18px;
      font-size: 14px;
      color: #D4B99A;
      font-weight: 500;
    }

    /* ── Free tier ─── */
    .free-tier {
      background: #FAF7F2;
      padding: 72px 24px;
    }
    .free-tier-inner { max-width: 680px; margin: 0 auto; text-align: center; }
    .free-tier h2 {
      font-family: 'Fraunces', Georgia, serif;
      font-weight: 500;
      font-size: clamp(28px, 5vw, 42px);
      line-height: 1.15;
      color: #2C1A0E;
      margin-bottom: 16px;
    }
    .free-tier p { font-size: 17px; line-height: 1.7; color: #6B4226; max-width: 480px; margin: 0 auto 20px; }
    .free-tier-perks {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 28px;
    }
    .perk-chip {
      background: #F0EBE3;
      border: 1px solid #E0D5C8;
      border-radius: 100px;
      padding: 8px 16px;
      font-size: 14px;
      color: #6B4226;
      font-weight: 500;
    }

    /* ── Brew guides grid ─── */
    .guides {
      background: #2C1A0E;
      padding: 72px 24px;
    }
    .guides-inner { max-width: 860px; margin: 0 auto; }
    .guides .section-label { color: #6B5040; text-align: left; margin-bottom: 28px; }
    .guides-heading {
      font-family: 'Fraunces', Georgia, serif;
      font-weight: 500;
      font-size: clamp(26px, 4vw, 36px);
      color: #FAF7F2;
      margin-bottom: 32px;
      line-height: 1.2;
    }
    .guide-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1px;
      background: #3D2410;
      border: 1px solid #3D2410;
      border-radius: 12px;
      overflow: hidden;
    }
    .guide-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 18px 20px;
      background: #2C1A0E;
      text-decoration: none;
      transition: background 0.15s;
    }
    .guide-card:hover { background: #3A2214; }
    .guide-card-label { font-size: 14px; color: #D4B99A; font-weight: 500; line-height: 1.4; }
    .guide-card-arrow { color: #6B5040; flex-shrink: 0; }

    /* ── Bottom CTA ─── */
    .bottom-cta {
      background: #FAF7F2;
      padding: 80px 24px;
      text-align: center;
    }
    .bottom-cta h2 {
      font-family: 'Fraunces', Georgia, serif;
      font-weight: 500;
      font-size: clamp(28px, 5vw, 44px);
      color: #2C1A0E;
      line-height: 1.15;
      margin-bottom: 14px;
    }
    .bottom-cta p { font-size: 17px; color: #6B4226; max-width: 380px; margin: 0 auto 32px; }
  </style>
</head>
<body>

${renderNav()}

<!-- Hero -->
<section class="hero">
  <p class="hero-eyebrow">Coffee Brew Coach</p>
  <h1>Coaching that tells you exactly why your coffee tastes wrong — and how to fix it.</h1>
  <p class="hero-sub">Describe your brew. Get one specific fix. Better coffee on the next cup.</p>
  ${DOWNLOAD_BTNS}
  <p class="hero-fine">Free · iOS · Android coming soon · No credit card required</p>
</section>

<!-- How it works -->
<section class="hiw" aria-labelledby="hiw-label">
  <div class="hiw-inner">
    <p class="section-label" id="hiw-label">How it works</p>
    <div class="steps">
      <div class="step">
        <p class="step-num">1</p>
        <h3>Describe your taste.</h3>
        <p>Too bitter, sour, weak, or flat — just pick what you noticed. No technical knowledge required. Plain language only.</p>
      </div>
      <div class="step">
        <p class="step-num">2</p>
        <h3>Coach diagnoses your brew.</h3>
        <p>Coffee Brew Coach cross-references your tasting notes against your brew method, dose, grind, and extraction time to pinpoint the problem.</p>
      </div>
      <div class="step">
        <p class="step-num">3</p>
        <h3>Get one specific fix.</h3>
        <p>Not a list of possibilities — one targeted change to make on your next brew. Grind finer. Drop the dose 0.5 g. Shorten your steep by 15 seconds.</p>
      </div>
    </div>
  </div>
</section>

<!-- Brew methods -->
<section class="methods" aria-label="Supported brew methods">
  <div>
    <p class="section-label">Works with every brew method</p>
    <div class="methods-list" role="list">
      <span class="method-pill" role="listitem">Espresso</span>
      <span class="method-pill" role="listitem">V60</span>
      <span class="method-pill" role="listitem">AeroPress</span>
      <span class="method-pill" role="listitem">French Press</span>
      <span class="method-pill" role="listitem">Chemex</span>
      <span class="method-pill" role="listitem">Kalita Wave</span>
      <span class="method-pill" role="listitem">Moka Pot</span>
      <span class="method-pill" role="listitem">Cold Brew</span>
      <span class="method-pill" role="listitem">Drip Machine</span>
    </div>
  </div>
</section>

<!-- Free tier -->
<section class="free-tier" aria-labelledby="free-heading">
  <div class="free-tier-inner">
    <h2 id="free-heading">Start free.<br/>No credit card needed.</h2>
    <p>Every account gets 10 free coached brews per month — enough to dial in a new coffee or fix a persistent problem. Upgrade to Pro for unlimited sessions.</p>
    <div class="free-tier-perks">
      <span class="perk-chip">10 free coaching sessions/month</span>
      <span class="perk-chip">All brew methods included</span>
      <span class="perk-chip">No credit card required</span>
      <span class="perk-chip">iOS &amp; Android</span>
    </div>
  </div>
</section>

<!-- Brew guides -->
<section class="guides" aria-labelledby="guides-heading">
  <div class="guides-inner">
    <p class="section-label">Brewing guides</p>
    <h2 class="guides-heading" id="guides-heading">Learn the fundamentals.</h2>
    <div class="guide-grid">
      ${guideCards}
    </div>
  </div>
</section>

<!-- Bottom CTA -->
<section class="bottom-cta">
  <h2>Better coffee starts<br/>on the next cup.</h2>
  <p>Free to download. Works with espresso, pour over, AeroPress, and more.</p>
  ${DOWNLOAD_BTNS}
</section>

${WAITLIST_MODAL}
${renderFooter()}

</body>
</html>`;

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
