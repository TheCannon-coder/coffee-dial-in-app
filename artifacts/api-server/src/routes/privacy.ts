import { Router } from "express";

const router = Router();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Dial In Coffee Coach</title>
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

    .wordmark {
      font-family: Georgia, serif;
      font-style: italic;
      font-weight: 300;
      font-size: 18px;
      color: #8B6347;
      margin-bottom: 48px;
      display: block;
    }

    h1 {
      font-family: Georgia, serif;
      font-size: 36px;
      font-weight: 500;
      line-height: 1.2;
      margin-bottom: 8px;
    }

    .effective {
      font-size: 14px;
      color: #8B6347;
      margin-bottom: 48px;
    }

    h2 {
      font-family: Georgia, serif;
      font-size: 20px;
      font-weight: 500;
      margin-top: 40px;
      margin-bottom: 12px;
    }

    p {
      font-size: 16px;
      color: #3D2410;
      margin-bottom: 16px;
    }

    ul {
      padding-left: 20px;
      margin-bottom: 16px;
    }

    li {
      font-size: 16px;
      color: #3D2410;
      margin-bottom: 8px;
    }

    a {
      color: #8B6347;
      text-decoration: underline;
    }

    hr {
      border: none;
      border-top: 1px solid #E8DDD4;
      margin: 48px 0;
    }

    .contact-box {
      background: #F0E8DF;
      border-radius: 12px;
      padding: 24px;
      margin-top: 40px;
    }

    .contact-box p {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <span class="wordmark">Dial In</span>

    <h1>Privacy Policy</h1>
    <p class="effective">Effective date: June 6, 2025</p>

    <p>
      Dial In Coffee Coach ("we", "our", or "us") operates the Dial In — Coffee Coach mobile application
      (the "App"). This policy explains what information we collect, how we use it, and your choices.
    </p>

    <h2>1. Information we collect</h2>

    <p><strong>Information you provide</strong></p>
    <ul>
      <li><strong>Email address</strong> — used to create and identify your account, send transactional emails, and manage your subscription.</li>
      <li><strong>Brew data</strong> — the coffee name, brew method, grind settings, dose, water volume, tasting notes, and AI-generated advice you log in the app. This data is stored so you can review your history and improve over time.</li>
    </ul>

    <p><strong>Information collected automatically</strong></p>
    <ul>
      <li><strong>Device push token</strong> — collected only if you grant notification permission. Used solely to send you brew reminders you request in the app.</li>
      <li><strong>Brew timestamps</strong> — the date and time of each brew session, used to track monthly usage and award achievements.</li>
      <li><strong>Referral codes</strong> — generated for your account when you share the app with a friend.</li>
    </ul>

    <p><strong>Payment information</strong></p>
    <p>
      If you subscribe to Dial In Pro, payments are processed by
      <a href="https://stripe.com/privacy" target="_blank" rel="noopener">Stripe</a>.
      We do not store your card number, expiry date, or CVV. We only retain a Stripe customer ID
      and subscription status.
    </p>

    <h2>2. How we use your information</h2>
    <ul>
      <li>To generate personalised brewing advice using an AI model</li>
      <li>To maintain your brew history and coffee folders</li>
      <li>To track your monthly brew count and manage subscription limits</li>
      <li>To send brew reminder notifications (only if you opt in)</li>
      <li>To process payments and manage your Pro subscription</li>
      <li>To award achievements and track your progress</li>
      <li>To operate the referral programme</li>
    </ul>

    <p>We do not sell your data, use it for advertising, or share it with third parties except as described in this policy.</p>

    <h2>3. Third-party services</h2>
    <ul>
      <li><strong>Stripe</strong> — payment processing. <a href="https://stripe.com/privacy" target="_blank" rel="noopener">Privacy policy</a></li>
      <li><strong>Supabase</strong> — database and backend infrastructure. Data is stored on servers in the United States. <a href="https://supabase.com/privacy" target="_blank" rel="noopener">Privacy policy</a></li>
      <li><strong>Expo / Expo Push</strong> — push notification delivery. <a href="https://expo.dev/privacy" target="_blank" rel="noopener">Privacy policy</a></li>
      <li><strong>Anthropic / OpenAI</strong> — AI brewing advice generation. Your brew parameters are sent to generate a response. No personally identifiable information is included in those requests.</li>
    </ul>

    <h2>4. Data stored on your device</h2>
    <p>
      Brew counts, achievement badges, and notification preferences are stored locally on your device
      using AsyncStorage. This data is not transmitted to our servers and is cleared if you uninstall the app.
    </p>

    <h2>5. Data retention</h2>
    <p>
      We retain your account and brew history for as long as your account is active.
      If you delete your account, we will delete your personal data within 30 days,
      except where we are required by law to retain it (e.g. payment records).
    </p>

    <h2>6. Your rights</h2>
    <p>Depending on where you live, you may have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you</li>
      <li>Request correction of inaccurate data</li>
      <li>Request deletion of your data</li>
      <li>Withdraw consent at any time (e.g. by disabling notifications in the app)</li>
      <li>Lodge a complaint with your local data protection authority</li>
    </ul>
    <p>To exercise any of these rights, email us at the address below.</p>

    <h2>7. Children</h2>
    <p>
      Dial In is not directed at children under 13. We do not knowingly collect personal
      information from anyone under 13. If you believe we have collected such information,
      please contact us and we will delete it promptly.
    </p>

    <h2>8. Changes to this policy</h2>
    <p>
      We may update this policy from time to time. If we make material changes, we will notify
      you via the app or by email. Continued use of the app after changes take effect constitutes
      your acceptance of the revised policy.
    </p>

    <hr />

    <div class="contact-box">
      <h2 style="margin-top: 0;">Contact us</h2>
      <p>If you have any questions about this privacy policy or how we handle your data:</p>
      <p><strong>Email:</strong> <a href="mailto:privacy@coffeebrew.coach">privacy@coffeebrew.coach</a></p>
      <p><strong>Website:</strong> <a href="https://coffeebrew.coach">coffeebrew.coach</a></p>
    </div>
  </div>
</body>
</html>`;

router.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
