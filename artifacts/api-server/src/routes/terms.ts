import { Router } from "express";

const router = Router();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terms of Use — Coffee Brew Coach</title>
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
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #7B5E47;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      line-height: 1.2;
    }

    .effective {
      color: #7B5E47;
      font-size: 14px;
      margin-bottom: 40px;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-top: 40px;
      margin-bottom: 10px;
    }

    p {
      margin-bottom: 16px;
      color: #4A3728;
    }

    ul {
      margin: 0 0 16px 20px;
      color: #4A3728;
    }

    li { margin-bottom: 6px; }

    a {
      color: #7B5E47;
      text-decoration: underline;
    }

    .divider {
      border: none;
      border-top: 1px solid #E8DDD4;
      margin: 40px 0;
    }

    .contact-box {
      background: #F0E8DF;
      border-radius: 12px;
      padding: 24px;
      margin-top: 40px;
    }

    .contact-box p { margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="brand-dot"></div>
      <span class="brand-name">Coffee Brew Coach</span>
    </div>

    <h1>Terms of Use</h1>
    <p class="effective">Effective date: June 1, 2025</p>

    <p>These Terms of Use govern your use of the Coffee Brew Coach mobile application ("App") operated by Christopher Poirier ("we", "us", or "our"). By downloading or using the App, you agree to these terms.</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using Coffee Brew Coach, you confirm that you are at least 13 years of age and agree to be bound by these Terms of Use and our <a href="/api/privacy">Privacy Policy</a>.</p>

    <h2>2. Dial In Pro — Auto-Renewing Subscription</h2>
    <p>Coffee Brew Coach offers an optional paid subscription called <strong>Dial In Pro</strong> that unlocks unlimited coffee coaching sessions.</p>

    <ul>
      <li><strong>Subscription name:</strong> Dial In Pro</li>
      <li><strong>Monthly plan:</strong> $4.99 per month</li>
      <li><strong>Annual plan:</strong> $44.99 per year (~$3.75/month, save 25%)</li>
      <li><strong>Free tier:</strong> 10 dial-in sessions per month, no payment required</li>
    </ul>

    <p>Subscriptions automatically renew at the end of each billing period (monthly or annually) unless cancelled at least 24 hours before the renewal date. Your Apple ID account will be charged upon confirmation of purchase and at the start of each renewal period.</p>

    <p>You can manage and cancel your subscription at any time in your device Settings &rsaquo; [Your Name] &rsaquo; Subscriptions, or in the App Store. Cancellation takes effect at the end of the current billing period; no partial refunds are issued for unused time.</p>

    <p>If you have any unused portion of a free trial (if offered), it will be forfeited when you purchase a subscription.</p>

    <h2>3. Apple In-App Purchases</h2>
    <p>All in-app purchases and subscriptions are processed by Apple through the App Store. Payment will be charged to your Apple ID. These transactions are also subject to Apple's <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">standard EULA</a> and <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</p>

    <h2>4. Use of the App</h2>
    <p>You agree to use Coffee Brew Coach only for lawful purposes and in accordance with these Terms. You may not:</p>
    <ul>
      <li>Reverse engineer, decompile, or disassemble any part of the App</li>
      <li>Use the App to transmit harmful, offensive, or unlawful content</li>
      <li>Attempt to gain unauthorized access to any systems connected to the App</li>
      <li>Use the App in any way that could damage, disable, or impair it</li>
    </ul>

    <h2>5. Intellectual Property</h2>
    <p>All content, features, and functionality of the App — including text, graphics, logos, and AI-generated coaching advice — are owned by us and protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>

    <h2>6. AI Coaching Disclaimer</h2>
    <p>Coffee Brew Coach provides AI-generated coffee brewing suggestions for informational and recreational purposes only. Recommendations are based on your self-reported tasting notes and general coffee science. Results may vary depending on your equipment, coffee, water quality, and technique. We do not guarantee any specific brewing outcome.</p>

    <h2>7. Disclaimer of Warranties</h2>
    <p>The App is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

    <h2>8. Limitation of Liability</h2>
    <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, even if we have been advised of the possibility of such damages.</p>

    <h2>9. Changes to These Terms</h2>
    <p>We may update these Terms from time to time. We will notify you of material changes by updating the effective date above. Continued use of the App after changes constitutes acceptance of the revised Terms.</p>

    <h2>10. Governing Law</h2>
    <p>These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles.</p>

    <hr class="divider" />

    <div class="contact-box">
      <h2 style="margin-top:0">Contact</h2>
      <p>Questions about these Terms? Reach us at <a href="mailto:support@coffeebrew.coach">support@coffeebrew.coach</a>.</p>
    </div>
  </div>
</body>
</html>`;

router.get("/api/terms", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
