import { Router } from "express";

const router = Router();

router.get("/earn", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>How much could you earn? — Dial In Coffee Coach</title>
  <meta name="description" content="Calculate your referral earnings from Dial In Coffee Coach." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #2C1A0E; }
    body {
      font-family: -apple-system, 'DM Sans', system-ui, sans-serif;
      display: flex; align-items: flex-start; justify-content: center;
      min-height: 100vh;
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
      text-transform: uppercase; color: rgba(250,247,242,0.35);
      margin-bottom: 28px;
    }
    h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-style: italic; font-weight: 400;
      font-size: 30px; line-height: 1.15; color: #FAF7F2;
      text-align: center; margin-bottom: 10px;
    }
    .subtitle { font-size: 14px; color: #A89080; line-height: 1.6; text-align: center; margin-bottom: 36px; }
    .subtitle strong { color: #C8A97A; }

    /* slider */
    .slider-section { width: 100%; margin-bottom: 30px; }
    .slider-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    .slider-label { font-size: 13px; color: #A89080; }
    .slider-value { font-size: 20px; font-weight: 800; color: #C8A97A; }
    .track-wrap { position: relative; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); }
    .track-fill {
      position: absolute; left: 0; top: 0; height: 100%; border-radius: 4px;
      background: linear-gradient(90deg, #8B6347, #C8A97A);
      width: 0; transition: width 0.08s ease; pointer-events: none;
    }
    .track-thumb {
      position: absolute; top: 50%; transform: translate(-50%,-50%);
      width: 22px; height: 22px; border-radius: 50%;
      background: #FAF7F2; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transition: left 0.08s ease; pointer-events: none;
    }
    input[type=range] {
      position: absolute; inset: 0; width: 100%; height: 100%;
      opacity: 0; cursor: pointer; margin: 0; -webkit-appearance: none;
    }
    .ticks { position: relative; margin-top: 10px; height: 20px; }
    .tick {
      position: absolute; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 3px;
    }
    .tick-line { width: 1px; height: 4px; background: rgba(255,255,255,0.18); }
    .tick-label { font-size: 10px; color: rgba(255,255,255,0.22); white-space: nowrap; }

    /* funnel */
    .funnel { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 26px; }
    .funnel-row {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 16px;
    }
    .funnel-icon { font-size: 18px; }
    .funnel-label { font-size: 13px; color: #A89080; flex: 1; }
    .funnel-num { font-size: 18px; font-weight: 700; color: #FAF7F2; }

    /* earnings */
    .earnings-hero {
      width: 100%; background: rgba(255,255,255,0.07);
      border: 1px solid rgba(200,169,122,0.2); border-radius: 20px;
      padding: 24px 22px; text-align: center; margin-bottom: 18px;
    }
    .earnings-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #A89080; font-weight: 600; margin-bottom: 8px; }
    .earnings-row { display: flex; justify-content: center; align-items: flex-end; gap: 4px; margin-bottom: 4px; }
    .earnings-big { font-size: 52px; font-weight: 800; color: #C8A97A; line-height: 1; }
    .earnings-period { font-size: 15px; color: #A89080; margin-bottom: 9px; }
    .earnings-yearly { font-size: 14px; color: #A89080; }
    .earnings-yearly span { color: #FAF7F2; font-weight: 700; }

    /* tier */
    .tier { text-align: center; margin-bottom: 28px; min-height: 58px; }
    .tier-emoji { font-size: 26px; margin-bottom: 6px; }
    .tier-text { font-size: 14px; color: #C8A97A; font-style: italic; }

    /* cta */
    .cta {
      width: 100%; background: #FAF7F2; color: #2C1A0E;
      border: none; border-radius: 100px; padding: 17px;
      font-size: 16px; font-weight: 700; cursor: pointer;
      font-family: inherit; text-decoration: none;
      display: block; text-align: center; transition: opacity 0.15s;
    }
    .cta:hover { opacity: 0.88; }
    .fine-print { margin-top: 14px; font-size: 11px; color: rgba(255,255,255,0.18); text-align: center; line-height: 1.6; }
  </style>
</head>
<body>
<div class="widget">
  <div class="wordmark">dial in &middot; coffee coach</div>
  <h1>How much could<br>you earn?</h1>
  <p class="subtitle">Earn <strong>$${parseFloat(process.env.REFERRAL_COMMISSION ?? "2.0").toFixed(2)}/month</strong> for every Pro subscriber<br>you bring to Dial In.</p>

  <div class="slider-section">
    <div class="slider-row">
      <span class="slider-label">My audience reach</span>
      <span class="slider-value" id="audienceLabel">50k</span>
    </div>
    <div class="track-wrap">
      <div class="track-fill"  id="trackFill"></div>
      <div class="track-thumb" id="trackThumb"></div>
      <input type="range" id="slider" min="0" max="100" step="0.5" value="57" />
    </div>
    <div class="ticks" id="ticks"></div>
  </div>

  <div class="funnel">
    <div class="funnel-row">
      <span class="funnel-icon">📣</span>
      <span class="funnel-label">Audience reached</span>
      <span class="funnel-num" id="fAudience">50k</span>
    </div>
    <div class="funnel-row">
      <span class="funnel-icon">👤</span>
      <span class="funnel-label">Sign up (~25%)</span>
      <span class="funnel-num" id="fSignups">3.1k</span>
    </div>
    <div class="funnel-row">
      <span class="funnel-icon">⭐</span>
      <span class="funnel-label">Go Pro (~18% of signups)</span>
      <span class="funnel-num" id="fPro">563</span>
    </div>
  </div>

  <div class="earnings-hero">
    <div class="earnings-label">Monthly earnings</div>
    <div class="earnings-row">
      <span class="earnings-big" id="eMonthly">$563</span>
      <span class="earnings-period">/month</span>
    </div>
    <div class="earnings-yearly"><span id="eYearly">$6.8k</span> per year</div>
  </div>

  <div class="tier" id="tierBlock">
    <div class="tier-emoji" id="tierEmoji">🚀</div>
    <div class="tier-text"  id="tierText">Full-time side income territory.</div>
  </div>

  <a href="https://coffeebrew.coach" class="cta">Get your referral code &rarr;</a>
  <p class="fine-print">Paid monthly &middot; No minimum &middot; Conversions based on avg user data</p>
</div>

<script>
(function () {
  var CONV_SIGNUP = 0.25;
  var CONV_PRO    = 0.18;
  var COMMISSION  = ${parseFloat(process.env.REFERRAL_COMMISSION ?? "2.0")};
  var LOG_MIN = Math.log10(1e3);
  var LOG_MAX = Math.log10(1e6);

  // Build tick marks
  var TICKS = [
    { pos: 0,   label: "1k" },
    { pos: 25,  label: "10k" },
    { pos: 50,  label: "50k" },
    { pos: 75,  label: "250k" },
    { pos: 100, label: "1M" },
  ];
  var ticksEl = document.getElementById("ticks");
  TICKS.forEach(function(t) {
    var div  = document.createElement("div");
    div.className = "tick";
    div.style.left = t.pos + "%";
    div.innerHTML = '<div class="tick-line"></div><span class="tick-label">' + t.label + '</span>';
    ticksEl.appendChild(div);
  });

  function posToAudience(pos) {
    return Math.round(Math.pow(10, LOG_MIN + (pos / 100) * (LOG_MAX - LOG_MIN)));
  }
  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "k";
    return String(n);
  }
  function fmtMoney(n) {
    if (n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
    return "$" + n;
  }

  var TIERS = [
    { minPro: 0,    emoji: "☕", msg: "A nice bonus on top of your content." },
    { minPro: 50,   emoji: "🔥", msg: "Covers a rent payment every month." },
    { minPro: 250,  emoji: "🚀", msg: "Full-time side income territory." },
    { minPro: 1000, emoji: "💰", msg: "This is a six-figure business." },
  ];
  function getTier(pro) {
    var t = TIERS[0];
    TIERS.forEach(function(tier) { if (pro >= tier.minPro) t = tier; });
    return t;
  }

  // Animated counter (operates on raw numbers, displays with fmt)
  var animState = {};
  function animateTo(id, target, formatter) {
    var el = document.getElementById(id);
    if (!el) return;
    if (animState[id]) cancelAnimationFrame(animState[id].raf);
    var from = animState[id] ? animState[id].current : target;
    var t0   = performance.now();
    var dur  = 350;
    function tick(now) {
      var t = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - t, 3);
      var val = Math.round(from + (target - from) * e);
      animState[id] = { raf: null, current: val };
      el.textContent = formatter(val);
      if (t < 1) animState[id].raf = requestAnimationFrame(tick);
    }
    animState[id] = { raf: requestAnimationFrame(tick), current: from };
  }

  var slider     = document.getElementById("slider");
  var trackFill  = document.getElementById("trackFill");
  var trackThumb = document.getElementById("trackThumb");
  var audLabel   = document.getElementById("audienceLabel");
  var tierEmoji  = document.getElementById("tierEmoji");
  var tierText   = document.getElementById("tierText");

  function update() {
    var pos      = parseFloat(slider.value);
    var audience = posToAudience(pos);
    var signups  = Math.round(audience * CONV_SIGNUP);
    var pro      = Math.round(signups  * CONV_PRO);
    var monthly  = Math.round(pro * COMMISSION);
    var yearly   = monthly * 12;

    trackFill.style.width = pos + "%";
    trackThumb.style.left = pos + "%";
    audLabel.textContent  = fmt(audience);

    animateTo("fAudience", audience, fmt);
    animateTo("fSignups",  signups,  fmt);
    animateTo("fPro",      pro,      fmt);
    animateTo("eMonthly",  monthly,  fmtMoney);
    animateTo("eYearly",   yearly,   fmtMoney);

    var tier = getTier(pro);
    tierEmoji.textContent = tier.emoji;
    tierText.textContent  = tier.msg;
  }

  slider.addEventListener("input", update);
  update();
})();
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(html);
});

export default router;
