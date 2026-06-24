import { Router } from "express";

const router = Router();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dial In — Coffee Coach</title>
  <meta name="description" content="AI-powered espresso coaching. Dial in your extraction through guided tasting and personalised recommendations." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, "DM Sans", system-ui, sans-serif;
      background: #FAF7F2;
      color: #2C1A0E;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
    }

    .card {
      max-width: 400px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .icon {
      width: 96px;
      height: 96px;
      border-radius: 22px;
      background: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(44,26,14,0.18);
    }

    .wordmark {
      font-family: Georgia, "Times New Roman", serif;
      font-style: italic;
      font-weight: 300;
      font-size: 15px;
      color: #8B6347;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    h1 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 36px;
      font-weight: 500;
      line-height: 1.15;
      color: #2C1A0E;
    }

    .tagline {
      font-size: 17px;
      line-height: 1.6;
      color: #6B4226;
      max-width: 300px;
    }

    .divider {
      width: 40px;
      height: 1px;
      background: #D4C4B0;
    }

    .app-store-link {
      display: inline-block;
      margin-top: 4px;
      transition: opacity 0.15s;
    }

    .app-store-link:hover {
      opacity: 0.82;
    }

    .app-store-link img {
      height: 52px;
      display: block;
    }

    .sub {
      font-size: 13px;
      color: #A08060;
      line-height: 1.5;
    }

    .links {
      display: flex;
      gap: 20px;
      margin-top: 8px;
    }

    .links a {
      font-size: 12px;
      color: #A08060;
      text-decoration: none;
      border-bottom: 1px solid #D4C4B0;
      padding-bottom: 1px;
    }

    .links a:hover {
      color: #6B4226;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="56" height="56">
        <path d="M10 11 C11 10 9 9 10 8 C11 7 9 6 10 5" stroke="white" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        <path d="M16 11 C17 10 15 9 16 8 C17 7 15 6 16 5" stroke="white" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        <rect x="5" y="12" width="16" height="2" rx="1" fill="white"/>
        <path d="M5 14 H21 L19 25 H7 Z" fill="white"/>
        <path d="M21 17 Q27 17 27 21 Q27 25 21 25" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="4" y="26" width="21" height="1.5" rx="0.75" fill="white"/>
      </svg>
    </div>

    <span class="wordmark">Coffee Brew Coach</span>

    <h1>Dial In</h1>

    <p class="tagline">
      AI-powered espresso coaching. Guided tasting, personalised extraction advice.
    </p>

    <div class="divider"></div>

    <a
      class="app-store-link"
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

    <p class="sub">Free to download &nbsp;·&nbsp; iOS</p>

    <div class="links">
      <a href="/api/privacy">Privacy Policy</a>
      <a href="/api/terms">Terms of Use</a>
    </div>
  </div>
</body>
</html>`;

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
