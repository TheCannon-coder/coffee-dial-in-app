import { Router } from "express";

const router = Router();

const SCALE = 0.5;

const features = [
  {
    n: 1,
    heading: "Tell us how it tasted.",
    body: "Too bitter, too sour, weak or flat — just pick what you noticed. No technical knowledge needed.",
    bg: "#2C1A0E",
    headingColor: "#FAF7F2",
    bodyColor: "#A89080",
    align: "left",
  },
  {
    n: 4,
    heading: "One clear fix. Every time.",
    body: "Get one precise coaching note based on exactly what you tasted. Not a list of possibilities — one thing to change next brew.",
    bg: "#FAF7F2",
    headingColor: "#2C1A0E",
    bodyColor: "#6B4226",
    align: "right",
  },
  {
    n: 2,
    heading: "Guided brew-alongs.",
    body: "Timed step-by-step guides for V60, AeroPress, French press and more. Just follow along.",
    bg: "#1A100A",
    headingColor: "#FAF7F2",
    bodyColor: "#A89080",
    align: "left",
  },
  {
    n: 3,
    heading: "Every coffee remembered.",
    body: "Your brewing history grouped by bean. See how each coffee improved over time and where you landed.",
    bg: "#FAF7F2",
    headingColor: "#2C1A0E",
    bodyColor: "#6B4226",
    align: "right",
  },
  {
    n: 5,
    heading: "Level up your craft.",
    body: "Earn badges as you improve. Work towards becoming a master brewer, one cup at a time.",
    bg: "#2C1A0E",
    headingColor: "#FAF7F2",
    bodyColor: "#A89080",
    align: "left",
  },
];

const phoneWidth = Math.round(430 * SCALE);
const phoneHeight = Math.round(932 * SCALE);

const phoneMockup = (n: number) => `
  <div class="phone-shell">
    <iframe
      src="/screenshots/${n}"
      width="430"
      height="932"
      scrolling="no"
      loading="lazy"
      title="App screenshot ${n}"
    ></iframe>
  </div>`;

const featureSections = features.map(f => {
  const isRight = f.align === "right";
  const phoneSide = `<div class="feature-phone ${isRight ? "order-last-desktop" : ""}">${phoneMockup(f.n)}</div>`;
  const textSide = `
    <div class="feature-text ${isRight ? "order-first-desktop" : ""}">
      <h2>${f.heading}</h2>
      <p>${f.body}</p>
    </div>`;
  return `
  <section class="feature" style="background:${f.bg};--h:${f.headingColor};--b:${f.bodyColor}">
    <div class="feature-inner">
      ${isRight ? `${textSide}${phoneSide}` : `${phoneSide}${textSide}`}
    </div>
  </section>`;
}).join("\n");

const faqs = [
  {
    q: "What is Dial In — Coffee Brew Coach?",
    a: "Dial In is a free iOS app that acts as your personal coffee coach. You describe how your cup tasted — bitter, sour, weak, flat — and the app gives you one precise adjustment to make on your next brew. No barista knowledge needed.",
  },
  {
    q: "Which brew methods does the app support?",
    a: "Dial In works with every common home brewing method: espresso, V60, AeroPress, Chemex, Kalita Wave, French press, Moka pot, cold brew, and drip machines.",
  },
  {
    q: "How do I dial in my espresso?",
    a: "Open the app, select Espresso as your brew method, enter your dose and shot time, then tap the tasting notes that describe your cup. The app diagnoses your extraction and tells you exactly whether to grind finer or coarser, adjust your dose, or change your ratio.",
  },
  {
    q: "Does it work for pour over coffee like V60?",
    a: "Yes. Dial In supports V60, Chemex, Kalita Wave, and any other pour-over method. Just select your method, describe the taste, and get a targeted adjustment.",
  },
  {
    q: "Is the app free?",
    a: "Yes — Dial In is free to download with 10 coaching sessions per month included. A Pro upgrade is available for unlimited sessions.",
  },
  {
    q: "Do I need coffee expertise to use it?",
    a: "No. The whole point is that you don't. You just describe what you taste in plain language — sour, bitter, weak, watery — and the app translates that into a specific technical fix.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(f => ({
    "@type": "Question",
    "name": f.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": f.a,
    },
  })),
};

const appSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Dial In — Coffee Brew Coach",
  "operatingSystem": "iOS",
  "applicationCategory": "LifestyleApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "description": "AI-powered coffee coaching app. Describe how your espresso or pour over tasted and get one precise adjustment to make next brew.",
  "url": "https://coffeebrew.coach",
  "downloadUrl": "https://apps.apple.com/app/id6777418888",
  "screenshot": "https://coffeebrew.coach/screenshots/1",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "ratingCount": "12",
  },
};

const faqItems = faqs.map(f => `
  <div class="faq-item">
    <button class="faq-q" aria-expanded="false">
      <span>${f.q}</span>
      <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="faq-a" hidden>
      <p>${f.a}</p>
    </div>
  </div>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary SEO -->
  <title>Dial In — Coffee Coaching App | Espresso & Pour Over Dialling In</title>
  <meta name="description" content="Dial In is a free iOS coffee coaching app. Describe how your espresso, V60 or AeroPress tasted — get one precise adjustment to make next brew. No barista knowledge needed." />
  <meta name="keywords" content="coffee coaching app, dial in espresso, pour over coffee guide, V60 app, AeroPress guide, coffee tasting app, espresso dialling in, home coffee brewing, coffee brew coach, coffee adjustment" />
  <meta name="author" content="Coffee Brew Coach" />
  <link rel="canonical" href="https://coffeebrew.coach/" />
  <meta name="robots" content="index, follow" />

  <!-- iOS Smart App Banner -->
  <meta name="apple-itunes-app" content="app-id=6777418888" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://coffeebrew.coach/" />
  <meta property="og:title" content="Dial In — Coffee Coaching App" />
  <meta property="og:description" content="Describe how your espresso or pour over tasted. Get one precise adjustment to make next brew. Free iOS app." />
  <meta property="og:image" content="https://coffeebrew.coach/screenshots/og" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Coffee Brew Coach" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Dial In — Coffee Coaching App" />
  <meta name="twitter:description" content="Describe how your espresso or pour over tasted. Get one precise adjustment to make next brew. Free iOS app." />
  <meta name="twitter:image" content="https://coffeebrew.coach/screenshots/og" />

  <!-- Structured data -->
  <script type="application/ld+json">${JSON.stringify(appSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300;1,9..144,500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      font-family: "DM Sans", -apple-system, system-ui, sans-serif;
      background: #FAF7F2;
      color: #2C1A0E;
    }

    /* ── Hero ─────────────────────────────────────────── */
    .hero {
      background: #2C1A0E;
      padding: 80px 24px 96px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0;
    }

    .app-icon {
      width: 88px;
      height: 88px;
      border-radius: 20px;
      background: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      margin-bottom: 24px;
    }

    .hero-wordmark {
      font-family: "Fraunces", Georgia, serif;
      font-style: italic;
      font-weight: 300;
      font-size: 14px;
      color: #A89080;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .hero h1 {
      font-family: "Fraunces", Georgia, serif;
      font-weight: 500;
      font-size: clamp(40px, 8vw, 64px);
      line-height: 1.1;
      color: #FAF7F2;
      margin-bottom: 20px;
    }

    .hero-tagline {
      font-size: 18px;
      line-height: 1.65;
      color: #A89080;
      max-width: 400px;
      margin-bottom: 40px;
    }

    .badge-link {
      display: inline-block;
      transition: opacity 0.15s;
    }
    .badge-link:hover { opacity: 0.8; }
    .badge-link img { height: 54px; display: block; }

    .hero-sub {
      font-size: 13px;
      color: #6B5040;
      margin-top: 14px;
    }

    /* ── Feature sections ─────────────────────────────── */
    .feature {
      padding: 72px 24px;
    }

    .feature-inner {
      max-width: 860px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 48px;
    }

    @media (min-width: 680px) {
      .feature-inner {
        flex-direction: row;
        gap: 64px;
        align-items: center;
      }
      .order-first-desktop  { order: -1; }
      .order-last-desktop   { order: 1; }
    }

    .feature-phone {
      flex-shrink: 0;
    }

    .phone-shell {
      width: ${phoneWidth}px;
      height: ${phoneHeight}px;
      border-radius: ${Math.round(38 * SCALE)}px;
      overflow: hidden;
      box-shadow: 0 24px 72px rgba(0,0,0,0.35);
      position: relative;
    }

    .phone-shell iframe {
      width: 430px;
      height: 932px;
      border: none;
      transform: scale(${SCALE});
      transform-origin: 0 0;
      pointer-events: none;
    }

    .feature-text {
      flex: 1;
      min-width: 0;
    }

    .feature-text h2 {
      font-family: "Fraunces", Georgia, serif;
      font-weight: 500;
      font-size: clamp(28px, 5vw, 40px);
      line-height: 1.2;
      color: var(--h);
      margin-bottom: 16px;
    }

    .feature-text p {
      font-size: 17px;
      line-height: 1.7;
      color: var(--b);
      max-width: 380px;
    }

    /* ── Brew methods strip ───────────────────────────── */
    .methods {
      background: #FAF7F2;
      padding: 56px 24px;
      text-align: center;
    }

    .methods-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #A89080;
      margin-bottom: 20px;
    }

    .methods-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      max-width: 640px;
      margin: 0 auto;
    }

    .method-pill {
      background: #F0EBE3;
      border: 1px solid #E0D5C8;
      border-radius: 100px;
      padding: 8px 18px;
      font-size: 14px;
      color: #6B4226;
      font-weight: 500;
    }

    /* ── FAQ ──────────────────────────────────────────── */
    .faq {
      background: #1A100A;
      padding: 72px 24px;
    }

    .faq-inner {
      max-width: 680px;
      margin: 0 auto;
    }

    .faq-heading {
      font-family: "Fraunces", Georgia, serif;
      font-weight: 500;
      font-size: clamp(28px, 5vw, 40px);
      color: #FAF7F2;
      margin-bottom: 40px;
      text-align: center;
    }

    .faq-item {
      border-bottom: 1px solid #2C1A0E;
    }

    .faq-item:first-of-type {
      border-top: 1px solid #2C1A0E;
    }

    .faq-q {
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 20px 0;
      text-align: left;
      color: #FAF7F2;
      font-family: "DM Sans", sans-serif;
      font-size: 16px;
      font-weight: 500;
      line-height: 1.4;
    }

    .faq-q:hover { color: #D4B99A; }

    .faq-chevron {
      flex-shrink: 0;
      color: #6B5040;
      transition: transform 0.2s ease;
    }

    .faq-q[aria-expanded="true"] .faq-chevron {
      transform: rotate(180deg);
    }

    .faq-a {
      padding-bottom: 20px;
    }

    .faq-a p {
      font-size: 15px;
      line-height: 1.7;
      color: #A89080;
    }

    /* ── CTA ──────────────────────────────────────────── */
    .cta {
      background: #FAF7F2;
      padding: 80px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .cta h2 {
      font-family: "Fraunces", Georgia, serif;
      font-weight: 500;
      font-size: clamp(28px, 5vw, 44px);
      line-height: 1.2;
      color: #2C1A0E;
      max-width: 480px;
    }

    .cta p {
      font-size: 17px;
      color: #8B6347;
      max-width: 360px;
      line-height: 1.6;
    }

    /* ── Footer ───────────────────────────────────────── */
    footer {
      background: #1A100A;
      padding: 32px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .footer-wordmark {
      font-family: "Fraunces", Georgia, serif;
      font-style: italic;
      font-weight: 300;
      font-size: 13px;
      color: #6B5040;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .footer-links {
      display: flex;
      gap: 24px;
    }

    .footer-links a {
      font-size: 12px;
      color: #6B5040;
      text-decoration: none;
      border-bottom: 1px solid #3D2410;
      padding-bottom: 1px;
    }

    .footer-links a:hover { color: #A89080; }

    .footer-copy {
      font-size: 11px;
      color: #3D2410;
    }
  </style>
</head>
<body>

  <!-- Hero -->
  <section class="hero">
    <div class="app-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="52" height="52">
        <path d="M10 11 C11 10 9 9 10 8 C11 7 9 6 10 5" stroke="white" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        <path d="M16 11 C17 10 15 9 16 8 C17 7 15 6 16 5" stroke="white" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        <rect x="5" y="12" width="16" height="2" rx="1" fill="white"/>
        <path d="M5 14 H21 L19 25 H7 Z" fill="white"/>
        <path d="M21 17 Q27 17 27 21 Q27 25 21 25" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="4" y="26" width="21" height="1.5" rx="0.75" fill="white"/>
      </svg>
    </div>

    <p class="hero-wordmark">Coffee Brew Coach</p>

    <h1>Dial In<br/>Your Coffee.</h1>

    <p class="hero-tagline">
      Describe how your espresso or pour over tasted.<br/>
      Get one precise adjustment for your next brew.<br/>
      Free. No barista knowledge required.
    </p>

    <a
      class="badge-link"
      href="https://apps.apple.com/app/id6777418888"
      target="_blank"
      rel="noopener"
      aria-label="Download Dial In on the App Store"
    >
      <img
        src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/white/en-us"
        alt="Download on the App Store"
      />
    </a>

    <p class="hero-sub">Free to download &nbsp;·&nbsp; iOS</p>
  </section>

  <!-- Brew methods strip -->
  <div class="methods">
    <p class="methods-label">Works with every brew method</p>
    <div class="methods-list" role="list">
      <span class="method-pill" role="listitem">Espresso</span>
      <span class="method-pill" role="listitem">V60</span>
      <span class="method-pill" role="listitem">AeroPress</span>
      <span class="method-pill" role="listitem">Chemex</span>
      <span class="method-pill" role="listitem">French Press</span>
      <span class="method-pill" role="listitem">Kalita Wave</span>
      <span class="method-pill" role="listitem">Moka Pot</span>
      <span class="method-pill" role="listitem">Cold Brew</span>
      <span class="method-pill" role="listitem">Drip Machine</span>
    </div>
  </div>

  <!-- Feature sections -->
  ${featureSections}

  <!-- FAQ -->
  <section class="faq" aria-labelledby="faq-heading">
    <div class="faq-inner">
      <h2 class="faq-heading" id="faq-heading">Common questions</h2>
      ${faqItems}
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <h2>Start dialling in<br/>your coffee today.</h2>
    <p>Free to download. Works with espresso, V60, AeroPress, and more.</p>
    <a
      class="badge-link"
      href="https://apps.apple.com/app/id6777418888"
      target="_blank"
      rel="noopener"
      aria-label="Download Dial In on the App Store"
    >
      <img
        src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us"
        alt="Download on the App Store"
      />
    </a>
  </section>

  <!-- Footer -->
  <footer>
    <p class="footer-wordmark">Dial In — Coffee Brew Coach</p>
    <div class="footer-links">
      <a href="/api/privacy">Privacy Policy</a>
      <a href="/api/terms">Terms of Use</a>
    </div>
    <p class="footer-copy">© ${new Date().getFullYear()} Coffee Brew Coach</p>
  </footer>

  <script>
    document.querySelectorAll('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        const answer = btn.nextElementSibling;
        if (expanded) answer.hidden = true;
        else answer.hidden = false;
      });
    });
  </script>

</body>
</html>`;

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
