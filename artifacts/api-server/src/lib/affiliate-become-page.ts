import { buildPage } from "./page-template.js";

const BASE = "https://www.coffeebrew.coach";

// Mirrors the live commission_phases rows (cents). Update both if rates change.
export const RATES = [
  { tier: "standard", label: "Standard", min: 0, range: "0–9", monthly: 75, annual: 500, lifetime: 700 },
  { tier: "silver", label: "Silver", min: 10, range: "10–99", monthly: 100, annual: 800, lifetime: 1000 },
  { tier: "gold", label: "Gold", min: 100, range: "100–999", monthly: 150, annual: 1200, lifetime: 1500 },
  { tier: "platinum", label: "Platinum", min: 1000, range: "1,000+", monthly: 200, annual: 1500, lifetime: 2000 },
] as const;

const usd = (cents: number): string =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

const FAQ = [
  {
    q: "How much does the Coffee Brew Coach affiliate program pay?",
    a: "It depends on the plan your referral picks. Monthly plan: a recurring commission every month they stay — $0.75 at Standard, rising to $2.00 at Platinum. Annual plan: $5 per subscriber at Standard, up to $15 at Platinum, paid in twelve monthly instalments. Lifetime plan: $7 up to $20, paid over six months. Tiers step up automatically at 10, 100, and 1,000 active referred subscribers and never step down.",
  },
  {
    q: "How do I join?",
    a: "In the app: download Coffee Brew Coach, tap Become an affiliate at the bottom of the Home screen, and apply. It takes about a minute — country, payout email, and the FTC disclosure. Then connect Stripe to receive payouts. There's no waitlist and no application review.",
  },
  {
    q: "What does my audience get?",
    a: "A free month of Pro. Anyone who signs up with your code or link gets their first month free — so you're recommending a free trial, not asking anyone to pay up front.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions become payable 30 days after the subscription starts (that covers the App Store refund window), and are paid out in batches through Stripe Connect straight to your bank. Stripe handles your tax forms — W-9 for the US, W-8BEN for Canada.",
  },
  {
    q: "Who can join?",
    a: "Anyone with a Coffee Brew Coach account based in the United States or Canada. Referred users can be anywhere in the world; only affiliate payouts are limited to US and CA for now.",
  },
  {
    q: "Do I have to disclose that I'm an affiliate?",
    a: "Yes. US and Canadian advertising rules require a clear disclosure whenever you share an affiliate link — a short line like \"I earn a commission if you subscribe through my link\" is enough. You accept this when you join.",
  },
] as const;

export const AFFILIATE_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(f => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const CSS = `
<style>
  .aff-hero-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 28px; }
  .aff-stat { background: #3D2410; border: 1px solid #5A3820; border-radius: 14px; padding: 14px 20px; min-width: 150px; text-align: left; }
  .aff-stat b { display: block; font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 26px; color: #FAF7F2; line-height: 1.1; }
  .aff-stat span { font-size: 12px; color: #A89080; letter-spacing: 0.04em; text-transform: uppercase; }
  .aff-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 1.5em 0; }
  .aff-step { background: #FFF; border: 1px solid #E0D5C8; border-radius: 14px; padding: 18px 18px 16px; }
  .aff-step .n { font-family: 'Fraunces', Georgia, serif; font-size: 30px; color: #C07A30; line-height: 1; margin-bottom: 8px; }
  .aff-step h3 { margin: 0 0 6px; font-size: 16px; }
  .aff-step p { font-size: 14px; margin: 0; line-height: 1.6; }
  .grind-table td:nth-child(n+3), .grind-table th:nth-child(n+3) { text-align: right; }
  .calc { background: #FFF; border: 1px solid #E0D5C8; border-radius: 16px; padding: 22px 22px 18px; margin: 1.25em 0 0.5em; }
  .calc label { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: #2C1A0E; margin-bottom: 6px; }
  .calc label output { color: #C07A30; }
  .calc input[type=range] { width: 100%; accent-color: #C07A30; margin-bottom: 18px; }
  .calc-out { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
  .calc-box { background: #F0EBE3; border-radius: 12px; padding: 14px 16px; }
  .calc-box b { display: block; font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 28px; color: #2C1A0E; line-height: 1.1; }
  .calc-box span { font-size: 12px; color: #6B4226; text-transform: uppercase; letter-spacing: 0.04em; }
  .calc-note { font-size: 13px; color: #6B4226; margin-top: 12px; line-height: 1.5; }
  .blurb { background: #F0EBE3; border-left: 3px solid #C07A30; border-radius: 0 12px 12px 0; padding: 14px 18px; font-size: 15px; line-height: 1.7; color: #3D2010; }
  .blurb code { background: #FFF; border: 1px solid #E0D5C8; border-radius: 6px; padding: 1px 6px; font-size: 14px; }
  .friend-card { background: #2C1A0E; border-radius: 16px; padding: 26px 26px 22px; color: #D4B99A; margin: 1.5em 0 0; }
  .friend-card h3 { font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 22px; color: #FAF7F2; margin: 0 0 8px; }
  .friend-card p { color: #A89080; font-size: 15px; margin: 0 0 6px; line-height: 1.65; }
  .friend-card p:last-child { margin: 0; }
  @media (max-width: 520px) { .calc-out { grid-template-columns: 1fr; } }
</style>`;

export function renderAffiliateBecomePage(): string {
  const tierRows = RATES.map(
    t => `<tr><td><strong>${t.label}</strong></td><td>${t.range}</td><td>${usd(t.monthly)}/mo</td><td>${usd(t.annual)}</td><td>${usd(t.lifetime)}</td></tr>`,
  ).join("\n      ");

  const faqHtml = FAQ.map(f => `<h3>${f.q}</h3>\n<p>${f.a}</p>`).join("\n");

  const body = `${CSS}
<header class="content-hero">
  <div class="content-hero-inner">
    <h1>Get paid every month someone you sent keeps brewing better coffee.</h1>
    <p class="lead">Recommend Coffee Brew Coach. Your audience gets a month of Pro free. You earn a commission every month they stay subscribed — for as long as they stay. Join in the app in about a minute. No waitlist.</p>
    <div class="aff-hero-stats" aria-label="Headline rates">
      <div class="aff-stat"><b>$0.75–$2</b><span>per monthly subscriber, every month</span></div>
      <div class="aff-stat"><b>$5–$15</b><span>per annual subscriber, over the year</span></div>
      <div class="aff-stat"><b>1 month free</b><span>for everyone you refer</span></div>
    </div>
    <a class="hero-cta" href="#join">How to join →</a>
  </div>
</header>

<div class="content-body">
  <h2>Why this works when a gear link doesn't</h2>
  <p>Amazon pays you once, 1–4%, on a purchase that was going to happen anyway. This pays you for the thing your content is actually about — helping people fix their coffee. Every Pro subscriber you refer pays out <strong>every month they stay</strong>, and your rate only ever goes up. Refer a few people a month from content you're already making, and the number keeps compounding instead of resetting.</p>
  <p>The person on the other end isn't being asked to spend anything. They get a <strong>free month of Pro</strong> for using your code. You're handing out a trial that happens to pay you if it sticks.</p>

  <h2>The rates</h2>
  <p>Your tier is set by how many of your referrals are active, paying subscribers right now. You're promoted automatically — and never demoted. What you earn per subscriber depends on the plan they pick:</p>
  <table class="grind-table">
    <thead><tr><th>Tier</th><th>Active referred subs</th><th>Monthly plan</th><th>Annual plan</th><th>Lifetime plan</th></tr></thead>
    <tbody>
      ${tierRows}
    </tbody>
  </table>
  <p><strong>Monthly plan:</strong> that amount every month, for as long as they stay. <strong>Annual plan:</strong> that amount per subscriber, paid to you in twelve monthly instalments — guaranteed for the year, since they've already paid. <strong>Lifetime:</strong> paid over six months.</p>
  <p>Reach Platinum and one of us gets in touch personally — at that point you're a meaningful part of how the app grows, and we treat it that way.</p>

  <h2>What that adds up to</h2>
  <div class="calc" id="calc" aria-label="Earnings estimate">
    <label for="c-subs">Active referred subscribers <output id="c-subs-out">25</output></label>
    <input type="range" id="c-subs" min="1" max="500" value="25" step="1" />
    <label for="c-annual">Share who pick annual <output id="c-annual-out">30%</output></label>
    <input type="range" id="c-annual" min="0" max="100" value="30" step="5" />
    <div class="calc-out">
      <div class="calc-box"><b id="c-month">$0</b><span>per month</span></div>
      <div class="calc-box"><b id="c-year">$0</b><span>over a year</span></div>
    </div>
    <p class="calc-note" id="c-note"></p>
  </div>
  <p>An estimate, not a promise — it assumes the monthly subscribers stay all year. Real earnings depend on how many people you send and how many keep using the app, which is why we care about you sending people it actually helps.</p>

  <h2 id="join">How to join</h2>
  <div class="aff-steps">
    <div class="aff-step"><div class="n">1</div><h3>Download the app</h3><p>Free on the App Store. Sign in with the email you'll use for payouts.</p></div>
    <div class="aff-step"><div class="n">2</div><h3>Tap "Become an affiliate"</h3><p>It's at the bottom of the Home screen. Pick your country, confirm your payout email, accept the disclosure.</p></div>
    <div class="aff-step"><div class="n">3</div><h3>Connect Stripe</h3><p>Two-minute setup. Stripe verifies you and collects your tax form (W-9 or W-8BEN) directly.</p></div>
    <div class="aff-step"><div class="n">4</div><h3>Share your code</h3><p>Your code and link are ready immediately. Put them anywhere your audience already is.</p></div>
  </div>
  <p><strong>Open to affiliates in the United States and Canada.</strong> Referred users can be anywhere in the world.</p>
  <p style="margin-top:18px;"><a class="store-btn store-btn-ios" href="https://apps.apple.com/app/id6777418888" target="_blank" rel="noopener" style="display:inline-flex;"><span class="store-btn-text"><span class="store-btn-sub">Download on the</span><span class="store-btn-main">App Store</span></span></a></p>

  <h2>What to say</h2>
  <p>You don't need a pitch. The thing that converts is the free month plus a specific problem. Something like:</p>
  <p class="blurb">"If your espresso keeps coming out sour or bitter and you're not sure what to change, I've been using Coffee Brew Coach — you tell it how the cup tasted and it tells you the one thing to fix next time. Use my code <code>YOURCODE</code> and your first month of Pro is free: coffeebrew.coach?ref=YOURCODE. (I earn a commission if you subscribe.)"</p>
  <p>Put the code in the text, not just the link — a new install loses the link, but people remember to type a code. And keep the disclosure in; it's required, and audiences trust it.</p>

  <h2>How you get paid</h2>
  <p>Commissions become payable 30 days after a subscription starts — that's the App Store refund window, and it means we never claw anything back from you. They're paid out in batches through <strong>Stripe Connect</strong>, direct to your bank, with a live dashboard showing every referral, your tier progress, and your payout history. No invoicing, no chasing.</p>

  <h2>Not a creator? Share it anyway.</h2>
  <div class="friend-card">
    <h3>Give a month, get a month.</h3>
    <p>Every account has a referral code. Send it to a friend whose coffee is bad: they get a month of Pro free, and once they've logged three brews, you get a month of Pro too.</p>
    <p>Bring in ten friends who stick with it and you get <strong style="color:#FAF7F2;">Pro for life</strong>. Find your code on the Home screen in the app.</p>
  </div>

  <h2>Common questions</h2>
  ${faqHtml}
</div>

<section class="cta-section">
  <h2>Already an affiliate?</h2>
  <p>See your live earnings, tier progress, and payout history.</p>
  <a class="store-btn store-btn-ios" href="/affiliate/login" style="display:inline-flex;"><span class="store-btn-text"><span class="store-btn-main">Log in to your dashboard</span></span></a>
</section>

<script>
(function () {
  var RATES = ${JSON.stringify(RATES.map(r => ({ min: r.min, label: r.label, monthly: r.monthly, annual: r.annual })))};
  var subs = document.getElementById("c-subs"), ann = document.getElementById("c-annual");
  if (!subs || !ann) return;
  var subsOut = document.getElementById("c-subs-out"), annOut = document.getElementById("c-annual-out");
  var mOut = document.getElementById("c-month"), yOut = document.getElementById("c-year"), note = document.getElementById("c-note");
  function money(c) { return "$" + Math.round(c / 100).toLocaleString(); }
  function rate(c) { return c % 100 === 0 ? "$" + (c / 100) : "$" + (c / 100).toFixed(2); }
  function calc() {
    var n = +subs.value, pct = +ann.value;
    var tier = RATES[0];
    for (var i = 0; i < RATES.length; i++) if (n >= RATES[i].min) tier = RATES[i];
    var annualSubs = Math.round(n * pct / 100), monthlySubs = n - annualSubs;
    var year = monthlySubs * tier.monthly * 12 + annualSubs * tier.annual;
    var perMonth = year / 12;
    subsOut.textContent = n; annOut.textContent = pct + "%";
    mOut.textContent = money(perMonth); yOut.textContent = money(year);
    note.textContent = tier.label + " tier · " + monthlySubs + " on monthly at " + rate(tier.monthly) + "/mo · " + annualSubs + " on annual at " + rate(tier.annual) + "/yr";
  }
  subs.addEventListener("input", calc); ann.addEventListener("input", calc); calc();
})();
</script>`;

  return buildPage({
    title: "Coffee Affiliate Program — Paid Every Month Your Referrals Stay Subscribed",
    description:
      "Coffee Brew Coach's affiliate program pays $0.75–$2 a month for every monthly Pro subscriber you refer, for as long as they stay, and $5–$15 per annual subscriber. Your audience gets a month free. Join in the app in a minute — no waitlist. US & Canada.",
    canonical: `${BASE}/affiliate/become`,
    bodyHtml: body,
    ogImage: `${BASE}/affiliate/og.png`,
  }).replace(
    "</head>",
    `  <script type="application/ld+json">${JSON.stringify(AFFILIATE_FAQ_SCHEMA)}</script>\n</head>`,
  );
}
