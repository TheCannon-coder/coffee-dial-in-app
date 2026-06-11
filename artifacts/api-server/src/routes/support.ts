import { Router } from "express";

const router = Router();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Support — Coffee Brew Coach</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, "DM Sans", system-ui, sans-serif;
      background: #FAF7F2;
      color: #2C1A0E;
      line-height: 1.7;
      padding: 0 20px;
    }

    .wrap {
      max-width: 680px;
      margin: 0 auto;
      padding: 60px 0 100px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 48px;
    }

    .brand-name {
      font-size: 20px;
      font-weight: 500;
      letter-spacing: -0.3px;
    }

    .brand-dot {
      width: 8px;
      height: 8px;
      background: #6F4E37;
      border-radius: 50%;
    }

    h1 {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .intro {
      font-size: 17px;
      color: #6B5A4E;
      margin-bottom: 48px;
      max-width: 540px;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      margin-top: 40px;
    }

    p {
      color: #4A3728;
      margin-bottom: 16px;
    }

    .contact-card {
      background: #fff;
      border: 1px solid #E8DDD4;
      border-radius: 16px;
      padding: 28px;
      margin-top: 40px;
    }

    .contact-card h2 {
      margin-top: 0;
    }

    a {
      color: #6F4E37;
      font-weight: 500;
    }

    a:hover {
      text-decoration: underline;
    }

    .faq-item {
      border-top: 1px solid #E8DDD4;
      padding: 20px 0;
    }

    .faq-q {
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 6px;
    }

    .faq-a {
      font-size: 15px;
      color: #4A3728;
    }

    footer {
      margin-top: 64px;
      padding-top: 24px;
      border-top: 1px solid #E8DDD4;
      font-size: 13px;
      color: #A08878;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="brand-dot"></div>
      <span class="brand-name">Coffee Brew Coach</span>
    </div>

    <h1>Support</h1>
    <p class="intro">
      We're here to help you dial in the perfect cup. Browse the FAQs below or reach out directly — we typically reply within 24 hours.
    </p>

    <h2>Frequently asked questions</h2>

    <div class="faq-item">
      <div class="faq-q">How do free dial-ins work?</div>
      <div class="faq-a">Every account gets 10 free dial-ins per month. Your count resets on the 1st of each month. Upgrade to Pro for unlimited dial-ins.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">What brew methods does the app support?</div>
      <div class="faq-a">Coffee Brew Coach works with espresso, V60, AeroPress, French press, Chemex, Moka pot, cold brew, and more. Select your method when starting a new brew session.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">How do I cancel or manage my subscription?</div>
      <div class="faq-a">Subscriptions are managed through the App Store. Go to Settings → Apple ID → Subscriptions on your iPhone or iPad to cancel or change your plan.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">I upgraded to Pro but the app still shows my old limit. What do I do?</div>
      <div class="faq-a">Try closing and reopening the app. If the issue persists, use the "Restore purchases" option in the app's settings, or contact us at the email below.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">My brew sessions aren't saving. What's wrong?</div>
      <div class="faq-a">Brew sessions are stored locally on your device. If you're not seeing saved sessions, ensure the app has storage access and that you're not running low on device storage. Contact us if the problem continues.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">Can I use the app on multiple devices?</div>
      <div class="faq-a">Your Pro subscription is tied to your Apple ID and can be used on any device you own. Brew history is currently stored per device.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">How does the AI coaching work?</div>
      <div class="faq-a">After you log how your cup tasted, the AI analyzes your tasting notes alongside your brew parameters (dose, grind, water temp, brew time) and gives you one clear adjustment to try next. It's designed to change one variable at a time so you can track what actually made a difference.</div>
    </div>

    <div class="contact-card">
      <h2>Contact us</h2>
      <p>
        Can't find what you're looking for? Email us at
        <a href="mailto:support@coffeebrew.coach">support@coffeebrew.coach</a>
        and we'll get back to you within 24 hours.
      </p>
      <p style="margin-bottom:0">
        For subscription billing issues, you can also contact
        <a href="https://support.apple.com/billing" target="_blank" rel="noopener">Apple Support</a> directly.
      </p>
    </div>

    <footer>
      &copy; ${new Date().getFullYear()} Coffee Brew Coach &nbsp;&middot;&nbsp;
      <a href="/api/privacy">Privacy Policy</a>
    </footer>
  </div>
</body>
</html>`;

router.get("/api/support", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
