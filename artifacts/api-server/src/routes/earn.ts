import { Router } from "express";

const router = Router();

router.get("/earn", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>How much could you earn? — Dial In Coffee Coach</title>
  <meta name="description" content="Calculate your potential referral earnings from Dial In Coffee Coach." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #2C1A0E; }
    body {
      font-family: -apple-system, 'DM Sans', system-ui, sans-serif;
      display: flex; align-items: flex-start; justify-content: center;
      padding: 0; min-height: 100vh;
    }
    .widget {
      width: 100%; max-width: 430px;
      background: #2C1A0E;
      min-height: 100vh;
      padding: 44px 28px 56px;
      display: flex; flex-direction: column; align-items: center;
    }
    .wordmark {
      font-size: 11px; font-weight: 700; letter-spacing: 0.15em;
      text-transform: uppercase; color: rgba(250,247,242,0.4);
      margin-bottom: 28px;
    }
    h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-style: italic; font-weight: 400;
      font-size: 30px; line-height: 1.15; color: #FAF7F2;
      text-align: center; margin-bottom: 10px;
    }
    .subtitle {
      font-size: 14px; color: #A89080; line-height: 1.6;
      text-align: center; margin-bottom: 36px;
    }
    .subtitle strong { color: #C8A97A; }
    .slider-section { width: 100%; margin-bottom: 32px; }
    .slider-labels {
      display: flex; justify-content: space-between;
      margin-bottom: 12px;
    }
    .slider-label { font-size: 13px; color: #A89080; }
    .slider-value { font-size: 17px; font-weight: 700; color: #C8A97A; }
    .track-wrap { position: relative; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); }
    .track-fill {
      position: absolute; left: 0; top: 0; height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #8B6347, #C8A97A);
      width: 0%; transition: width 0.1s ease;
      pointer-events: none;
    }
    .track-thumb {
      position: absolute; top: 50%; transform: translate(-50%, -50%);
      width: 22px; height: 22px; border-radius: 50%;
      background: #FAF7F2; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transition: left 0.1s ease; pointer-events: none;
    }
    input[type=range] {
      position: absolute; inset: 0; width: 100%; height: 100%;
      opacity: 0; cursor: pointer; margin: 0; -webkit-appearance: none;
    }
    .tick-labels {
      display: flex; justify-content: space-between;
      margin-top: 6px; font-size: 11px; color: rgba(255,255,255,0.2);
    }
    .funnel { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
    .funnel-row {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.06); border-radius: 12px;
      padding: 12px 16px;
    }
    .funnel-icon { font-size: 18px; }
    .funnel-label { font-size: 13px; color: #A89080; flex: 1; }
    .funnel-num {
      font-size: 20px; font-weight: 700; color: #FAF7F2;
      font-variant-numeric: tabular-nums; min-width: 32px; text-align: right;
      transition: opacity 0.15s;
    }
    .earnings-hero {
      width: 100%;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(200,169,122,0.2);
      border-radius: 20px; padding: 24px 22px;
      text-align: center; margin-bottom: 20px;
    }
    .earnings-label {
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em;
      color: #A89080; font-weight: 600; margin-bottom: 8px;
    }
    .earnings-amount { display: flex; justify-content: center; align-items: flex-end; gap: 4px; margin-bottom: 4px; }
    .earnings-big {
      font-size: 52px; font-weight: 800; color: #C8A97A; line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .earnings-period { font-size: 16px; color: #A89080; margin-bottom: 8px; }
    .earnings-yearly { font-size: 14px; color: #A89080; }
    .earnings-yearly span { color: #FAF7F2; font-weight: 600; }
    .tier-msg { text-align: center; margin-bottom: 28px; padding: 0 8px; display: none; }
    .tier-msg.visible { display: block; }
    .tier-emoji { font-size: 26px; margin-bottom: 6px; }
    .tier-text { font-size: 14px; color: #C8A97A; font-style: italic; }
    .cta {
      width: 100%; background: #FAF7F2; color: #2C1A0E;
      border: none; border-radius: 100px; padding: 17px;
      font-size: 16px; font-weight: 700; cursor: pointer;
      font-family: inherit; text-decoration: none;
      display: block; text-align: center;
      transition: opacity 0.15s;
    }
    .cta:hover { opacity: 0.88; }
    .fine-print {
      margin-top: 16px; font-size: 12px;
      color: rgba(255,255,255,0.2); text-align: center; line-height: 1.6;
    }
  </style>
</head>
<body>
<div class="widget">
  <div class="wordmark">dial in &middot; coffee coach</div>

  <h1>How much could<br>you earn?</h1>
  <p class="subtitle">
    Refer friends and earn <strong>$1 per month</strong><br>
    for every Pro subscriber you bring in.
  </p>

  <div class="slider-section">
    <div class="slider-labels">
      <span class="slider-label">I'll share with&hellip;</span>
      <span class="slider-value" id="inviteCount">20 people</span>
    </div>
    <div class="track-wrap">
      <div class="track-fill" id="trackFill"></div>
      <div class="track-thumb" id="trackThumb"></div>
      <input type="range" id="slider" min="1" max="200" value="20" />
    </div>
    <div class="tick-labels"><span>1</span><span>50</span><span>100</span><span>150</span><span>200</span></div>
  </div>

  <div class="funnel">
    <div class="funnel-row">
      <span class="funnel-icon">📨</span>
      <span class="funnel-label">Invites sent</span>
      <span class="funnel-num" id="fInvites">20</span>
    </div>
    <div class="funnel-row">
      <span class="funnel-icon">👤</span>
      <span class="funnel-label">Sign up (~25%)</span>
      <span class="funnel-num" id="fSignups">5</span>
    </div>
    <div class="funnel-row">
      <span class="funnel-icon">⭐</span>
      <span class="funnel-label">Go Pro (~18% of signups)</span>
      <span class="funnel-num" id="fPro">1</span>
    </div>
  </div>

  <div class="earnings-hero">
    <div class="earnings-label">Your earnings</div>
    <div class="earnings-amount">
      <span class="earnings-big" id="eMonthly">$1</span>
      <span class="earnings-period">/month</span>
    </div>
    <div class="earnings-yearly">
      <span id="eYearly">$12</span> per year
    </div>
  </div>

  <div class="tier-msg" id="tierMsg">
    <div class="tier-emoji" id="tierEmoji"></div>
    <div class="tier-text" id="tierText"></div>
  </div>

  <a href="https://coffeebrew.coach" class="cta">Get your referral code &rarr;</a>

  <p class="fine-print">
    Paid monthly. No minimum. Cancel anytime.<br>
    Conversions based on average user data.
  </p>
</div>

<script>
  var CONV_SIGNUP = 0.25;
  var CONV_PRO    = 0.18;
  var COMMISSION  = 1.0;

  var TIERS = [
    { max: 1,   emoji: "☕", msg: "That's your morning coffee covered." },
    { max: 4,   emoji: "🙌", msg: "A nice little side bonus." },
    { max: 15,  emoji: "🔥", msg: "Real income. Tell your friends!" },
    { max: 40,  emoji: "🚀", msg: "This is getting serious." },
    { max: Infinity, emoji: "💰", msg: "You're running a coffee media empire." },
  ];

  var slider      = document.getElementById("slider");
  var trackFill   = document.getElementById("trackFill");
  var trackThumb  = document.getElementById("trackThumb");
  var inviteCount = document.getElementById("inviteCount");
  var fInvites    = document.getElementById("fInvites");
  var fSignups    = document.getElementById("fSignups");
  var fPro        = document.getElementById("fPro");
  var eMonthly    = document.getElementById("eMonthly");
  var eYearly     = document.getElementById("eYearly");
  var tierMsg     = document.getElementById("tierMsg");
  var tierEmoji   = document.getElementById("tierEmoji");
  var tierText    = document.getElementById("tierText");

  // Animated counter
  var rafMap = {};
  function animateTo(el, target, prefix, suffix) {
    var key = el.id;
    if (rafMap[key]) cancelAnimationFrame(rafMap[key]);
    var start = parseInt(el.textContent.replace(/[^0-9]/g, "")) || 0;
    var t0 = performance.now();
    var dur = 350;
    function tick(now) {
      var t = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = Math.round(start + (target - start) * eased);
      el.textContent = (prefix || "") + val + (suffix || "");
      if (t < 1) rafMap[key] = requestAnimationFrame(tick);
    }
    rafMap[key] = requestAnimationFrame(tick);
  }

  function update() {
    var invites  = parseInt(slider.value);
    var pct      = ((invites - 1) / 199) * 100;
    var signups  = Math.round(invites * CONV_SIGNUP);
    var pro      = Math.round(signups * CONV_PRO);
    var monthly  = Math.round(pro * COMMISSION);
    var yearly   = monthly * 12;

    // Track
    trackFill.style.width  = pct + "%";
    trackThumb.style.left  = pct + "%";
    inviteCount.textContent = invites + (invites === 1 ? " person" : " people");

    // Funnel
    animateTo(fInvites,  invites,  "",  "");
    animateTo(fSignups,  signups,  "",  "");
    animateTo(fPro,      pro,      "",  "");

    // Earnings
    animateTo(eMonthly, monthly, "$", "");
    animateTo(eYearly,  yearly,  "$", "");

    // Tier
    if (pro > 0) {
      var tier = TIERS.find(function(t) { return pro < t.max; }) || TIERS[TIERS.length - 1];
      tierEmoji.textContent = tier.emoji;
      tierText.textContent  = tier.msg;
      tierMsg.classList.add("visible");
    } else {
      tierMsg.classList.remove("visible");
    }
  }

  slider.addEventListener("input", update);
  update();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(html);
});

export default router;
