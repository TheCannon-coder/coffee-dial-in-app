export const APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  "name": "Coffee Brew Coach",
  "operatingSystem": "iOS, Android",
  "applicationCategory": "FoodAndDrinkApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "description":
    "Coffee coaching that diagnoses why your coffee tastes wrong and gives you one specific fix per brew.",
  "url": "https://www.coffeebrew.coach",
  "downloadUrl": "https://apps.apple.com/app/id6777418888",
};

export const COMMON_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', -apple-system, system-ui, sans-serif; background: #FAF7F2; color: #2C1A0E; line-height: 1.6; }

  /* ── Nav ─── */
  .site-nav {
    background: #1A100A;
    padding: 0 24px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-logo {
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-weight: 300;
    font-size: 15px;
    color: #FAF7F2;
    text-decoration: none;
    letter-spacing: 0.04em;
  }
  .nav-links { display: flex; gap: 20px; align-items: center; }
  .nav-links a { color: #A89080; font-size: 13px; text-decoration: none; font-weight: 500; }
  .nav-links a:hover { color: #FAF7F2; }

  /* ── Content hero ─── */
  .content-hero { background: #2C1A0E; padding: 64px 24px 56px; text-align: center; }
  .content-hero-inner { max-width: 700px; margin: 0 auto; }
  .content-hero h1 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 500;
    font-size: clamp(28px, 5vw, 46px);
    line-height: 1.15;
    color: #FAF7F2;
    margin-bottom: 18px;
  }
  .content-hero .lead {
    font-size: 17px;
    color: #A89080;
    line-height: 1.65;
    max-width: 560px;
    margin: 0 auto;
  }

  /* ── Article body ─── */
  .content-body { max-width: 720px; margin: 0 auto; padding: 52px 24px 28px; }
  .content-body h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 500;
    font-size: clamp(22px, 3.5vw, 30px);
    color: #2C1A0E;
    margin: 2.25em 0 0.65em;
    line-height: 1.25;
  }
  .content-body h2:first-child { margin-top: 0; }
  .content-body h3 { font-size: 17px; font-weight: 600; color: #2C1A0E; margin: 1.5em 0 0.4em; }
  .content-body p { font-size: 16px; line-height: 1.85; color: #3D2010; margin-bottom: 1em; }
  .content-body ul, .content-body ol { padding-left: 1.5em; margin-bottom: 1.25em; }
  .content-body li { font-size: 16px; line-height: 1.8; color: #3D2010; margin-bottom: 0.25em; }
  .content-body strong { color: #2C1A0E; font-weight: 600; }

  /* ── Grind table ─── */
  .grind-table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 15px; overflow-x: auto; display: block; }
  .grind-table th, .grind-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #E0D5C8; white-space: nowrap; }
  .grind-table th { font-weight: 600; background: #F0EBE3; color: #2C1A0E; }
  .grind-table tr:last-child td { border-bottom: none; }

  /* ── How Coffee Brew Coach helps ─── */
  .cbc-section { background: #F0EBE3; padding: 56px 24px; border-top: 1px solid #E0D5C8; }
  .cbc-inner { max-width: 720px; margin: 0 auto; }
  .cbc-section h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 500;
    font-size: clamp(22px, 3.5vw, 30px);
    color: #2C1A0E;
    margin-bottom: 16px;
  }
  .cbc-section p { font-size: 16px; line-height: 1.85; color: #3D2010; margin-bottom: 1em; }

  /* ── Related links ─── */
  .related-section { background: #1A100A; padding: 44px 24px; }
  .related-inner { max-width: 720px; margin: 0 auto; }
  .related-section h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 500;
    font-size: 18px;
    color: #D4B99A;
    margin-bottom: 18px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-style: normal;
  }
  .related-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .related-list a { color: #A89080; text-decoration: none; font-size: 15px; font-weight: 500; }
  .related-list a:hover { color: #FAF7F2; text-decoration: underline; }

  /* ── Download buttons ─── */
  .download-btns { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px; }
  .store-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 11px 20px;
    border-radius: 10px;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.1s;
    min-width: 160px;
    border: none;
  }
  .store-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .store-btn-ios { background: #000; color: #fff; cursor: pointer; }
  .store-btn-icon { width: 22px; height: 22px; flex-shrink: 0; }
  .store-btn-text { display: flex; flex-direction: column; align-items: flex-start; }
  .store-btn-sub { font-size: 10px; opacity: 0.72; line-height: 1; margin-bottom: 2px; font-weight: 400; }
  .store-btn-main { font-size: 15px; font-weight: 600; line-height: 1.2; }

  /* Coming-soon Android button */
  .store-btn-cs {
    background: #2A2018;
    color: #7A6050;
    border: 1.5px solid #3D2E20;
    cursor: pointer;
    font-family: inherit;
  }
  .store-btn-cs:hover { background: #3A2E20; color: #D4B99A; opacity: 1; transform: translateY(-1px); }
  .store-btn-cs .store-btn-main { color: inherit; }

  /* ── Page CTA ─── */
  .cta-section { background: #FAF7F2; padding: 72px 24px; text-align: center; }
  .cta-section h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 500;
    font-size: clamp(26px, 4vw, 38px);
    color: #2C1A0E;
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .cta-section p { font-size: 17px; color: #6B4226; max-width: 380px; margin: 0 auto 28px; }

  /* ── Footer ─── */
  footer { background: #1A100A; padding: 28px 24px; text-align: center; }
  .footer-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .footer-wordmark { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 300; font-size: 13px; color: #6B5040; letter-spacing: 0.06em; }
  .footer-links { display: flex; gap: 22px; flex-wrap: wrap; justify-content: center; }
  .footer-links a { color: #6B5040; font-size: 12px; text-decoration: none; }
  .footer-links a:hover { color: #A89080; }
  .footer-copy { font-size: 11px; color: #3D2410; }

  /* ── Waitlist modal ─── */
  .wl-overlay {
    position: fixed; inset: 0;
    background: rgba(10,5,2,0.72);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; padding: 24px;
    backdrop-filter: blur(3px);
  }
  .wl-overlay[hidden] { display: none !important; }
  .wl-card {
    background: #FAF7F2; border-radius: 20px;
    padding: 36px 32px; max-width: 420px; width: 100%;
    position: relative;
    box-shadow: 0 28px 80px rgba(0,0,0,0.5);
    animation: wlSlideUp 0.2s ease;
  }
  @keyframes wlSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wl-close {
    position: absolute; top: 14px; right: 14px;
    background: none; border: none; cursor: pointer;
    color: #A89080; padding: 6px;
    display: flex; align-items: center; border-radius: 6px;
    transition: color 0.15s;
  }
  .wl-close:hover { color: #2C1A0E; }
  .wl-eyebrow {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #A89080; margin-bottom: 10px;
  }
  .wl-heading {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 500; font-size: 24px;
    line-height: 1.25; color: #2C1A0E; margin-bottom: 12px;
  }
  .wl-desc { font-size: 15px; color: #6B4226; line-height: 1.65; margin-bottom: 24px; }
  .wl-form { display: flex; flex-direction: column; gap: 10px; }
  .wl-input {
    border: 1.5px solid #E0D5C8; border-radius: 8px;
    padding: 12px 14px; font-size: 15px; color: #2C1A0E;
    background: #fff; font-family: inherit;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .wl-input:focus { border-color: #8B6347; box-shadow: 0 0 0 3px rgba(139,99,71,0.12); }
  .wl-submit {
    background: #2C1A0E; color: #FAF7F2;
    border: none; border-radius: 8px;
    padding: 13px 20px; font-size: 15px; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: background 0.15s;
  }
  .wl-submit:hover { background: #3D2410; }
  .wl-submit:disabled { opacity: 0.55; cursor: default; }
  .wl-success {
    font-size: 15px; color: #1B6B3A;
    background: #E8F5EE; border-radius: 10px;
    padding: 16px; text-align: center; line-height: 1.55;
  }
  .wl-error { font-size: 14px; color: #B91C1C; margin-top: 8px; }
`;

export const DOWNLOAD_BTNS = `
<div class="download-btns">
  <a class="store-btn store-btn-ios" href="https://apps.apple.com/app/id6777418888" target="_blank" rel="noopener" aria-label="Download Coffee Brew Coach on the App Store">
    <svg class="store-btn-icon" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.27-2.16 3.79.03 3.02 2.65 4.03 2.68 4.04l-.07.29zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
    <span class="store-btn-text">
      <span class="store-btn-sub">Download on the</span>
      <span class="store-btn-main">App Store</span>
    </span>
  </a>
  <button class="store-btn store-btn-cs" type="button" data-waitlist aria-label="Android coming soon — join the waitlist">
    <svg class="store-btn-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/></svg>
    <span class="store-btn-text">
      <span class="store-btn-sub">Google Play</span>
      <span class="store-btn-main">Coming Soon</span>
    </span>
  </button>
</div>`;

export const WAITLIST_MODAL = `
<div id="wl-overlay" class="wl-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="wl-heading">
  <div class="wl-card">
    <button class="wl-close" type="button" aria-label="Close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <p class="wl-eyebrow">Android &middot; Coming soon</p>
    <h2 class="wl-heading" id="wl-heading">Be first to know when we launch on Android.</h2>
    <p class="wl-desc">Drop your email and we&rsquo;ll send you one message the day it&rsquo;s live. No spam, ever.</p>
    <form class="wl-form" id="wl-form" novalidate>
      <input class="wl-input" type="email" name="email" placeholder="your@email.com" required autocomplete="email" />
      <button class="wl-submit" type="submit">Join the waitlist</button>
    </form>
    <p class="wl-success" hidden>You&rsquo;re on the list &mdash; we&rsquo;ll notify you when Android launches.</p>
    <p class="wl-error" hidden></p>
  </div>
</div>
<script>
(function () {
  var overlay = document.getElementById("wl-overlay");
  if (!overlay) return;
  var form = document.getElementById("wl-form");
  var input = form.querySelector("input");
  var submitBtn = form.querySelector(".wl-submit");
  var successEl = overlay.querySelector(".wl-success");
  var errorEl = overlay.querySelector(".wl-error");

  function open() {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { input.focus(); }, 60);
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  overlay.querySelector(".wl-close").addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });

  document.querySelectorAll("[data-waitlist]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      open();
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!email) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Joining\u2026";
    errorEl.hidden = true;

    fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, platform: "android" }),
    })
      .then(function (res) {
        return res.json().then(function (d) { return { ok: res.ok, data: d }; });
      })
      .then(function (r) {
        if (r.ok) {
          form.hidden = true;
          successEl.hidden = false;
          if (r.data.alreadyJoined) {
            successEl.textContent = "You\u2019re already on the list \u2014 we\u2019ll be in touch!";
          }
        } else {
          throw new Error(r.data.error || "error");
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Join the waitlist";
        errorEl.textContent = "Something went wrong. Please try again.";
        errorEl.hidden = false;
      });
  });
})();
</script>`;

export function renderNav(): string {
  return `
<nav class="site-nav" aria-label="Site navigation">
  <a class="nav-logo" href="/">Coffee Brew Coach</a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="https://apps.apple.com/app/id6777418888" target="_blank" rel="noopener">Download</a>
  </div>
</nav>`;
}

export function renderFooter(): string {
  return `
<footer>
  <div class="footer-inner">
    <p class="footer-wordmark">Coffee Brew Coach</p>
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/api/privacy">Privacy</a>
      <a href="/api/terms">Terms</a>
    </div>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} Coffee Brew Coach</p>
  </div>
</footer>`;
}

export function buildPage({
  title,
  description,
  canonical,
  bodyHtml,
}: {
  title: string;
  description: string;
  canonical: string;
  bodyHtml: string;
}): string {
  const ogImage = "https://www.coffeebrew.coach/screenshots/og";
  const fullTitle = `${title} | Coffee Brew Coach`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullTitle}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index, follow" />
  <meta name="apple-itunes-app" content="app-id=6777418888" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="Coffee Brew Coach" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />

  <script type="application/ld+json">${JSON.stringify(APP_SCHEMA)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300;1,9..144,500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${COMMON_CSS}</style>
</head>
<body>
${renderNav()}
${bodyHtml}
${WAITLIST_MODAL}
${renderFooter()}
</body>
</html>`;
}
