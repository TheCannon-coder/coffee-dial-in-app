import { Router } from "express";
import { buildPage, DOWNLOAD_BTNS } from "../lib/page-template.js";

const router = Router();

const BASE = "https://www.coffeebrew.coach";

function page(opts: {
  path: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  contentHtml: string;
  cbcHtml: string;
  related: Array<{ href: string; label: string }>;
  ctaHeading: string;
  skipAffiliateCallout?: boolean;
  affiliateCalloutHref?: string;
}): string {
  const relatedItems = [
    ...opts.related,
    { href: "/", label: "← Coffee Brew Coach home" },
  ]
    .map(r => `<li><a href="${r.href}">${r.label}</a></li>`)
    .join("\n");

  const affiliateCallout = opts.skipAffiliateCallout
    ? ""
    : `
<section class="cbc-section" style="border-top: 1px solid #E0D5C8;">
  <div class="cbc-inner" style="text-align:center;">
    <p style="font-size:15px; color:#6B4226;">Make coffee content? <a href="${opts.affiliateCalloutHref ?? "/affiliate/become"}">Learn how creators earn recurring commissions with our affiliate program →</a></p>
  </div>
</section>`;

  const body = `
<header class="content-hero">
  <div class="content-hero-inner">
    <h1>${opts.h1}</h1>
    <p class="lead">${opts.lead}</p>
  </div>
</header>

<div class="content-body">
  ${opts.contentHtml}
</div>

<section class="cbc-section">
  <div class="cbc-inner">
    <h2>How Coffee Brew Coach helps</h2>
    ${opts.cbcHtml}
  </div>
</section>
${affiliateCallout}

<section class="related-section">
  <div class="related-inner">
    <h2>Related guides</h2>
    <ul class="related-list">
      ${relatedItems}
    </ul>
  </div>
</section>

<section class="cta-section">
  <h2>${opts.ctaHeading}</h2>
  <p>Free to download. 10 coaching sessions per month included.</p>
  ${DOWNLOAD_BTNS}
</section>`;

  return buildPage({
    title: opts.title,
    description: opts.description,
    canonical: `${BASE}${opts.path}`,
    bodyHtml: body,
  });
}

/* ─── 1. Chemex ──────────────────────────────────────────────────────────── */

const chemexHtml = page({
  path: "/chemex",
  title: "Chemex Brewing Guide | Coffee Brew Coach",
  description:
    "How to brew Chemex coffee and fix common problems — weak, bitter, or slow extraction. Coaching from Coffee Brew Coach.",
  h1: "How to brew Chemex coffee",
  lead:
    "The Chemex produces one of the cleanest, brightest cups in coffee — but it's unforgiving. Get the grind or pour wrong and you'll end up with a bitter, muddy result. This guide covers everything you need to nail it.",
  contentHtml: `
<h2>What makes Chemex different</h2>
<p>The Chemex uses a bonded paper filter that is 20–30% thicker than standard pour-over filters. This removes almost all the oils and fine particles from your brew, producing an exceptionally clean, sediment-free cup with crisp acidity. That clarity is the Chemex's superpower — but it also means over-extraction shows up immediately as harsh bitterness.</p>
<p>The hourglass shape isn't just aesthetic. The wooden collar sits where the glass narrows, acting as an air vent so the water drains at the right speed. If you pour too aggressively or grind too fine, the filter will seal against the glass and stall the brew entirely.</p>

<h2>The recipe</h2>
<p>Start here and adjust based on taste:</p>
<ul>
  <li><strong>Dose:</strong> 30 g coffee to 500 g water (1:16.5 ratio)</li>
  <li><strong>Grind:</strong> Medium-coarse — like raw sugar crystals</li>
  <li><strong>Water temperature:</strong> 93–96 °C (200–205 °F)</li>
  <li><strong>Total brew time:</strong> 4–5 minutes</li>
</ul>
<p>The Chemex needs a coarser grind than most pour-over methods because of how slowly the thick filter drains. If your total brew time is under 3:30, grind coarser. Over 5:30, grind finer.</p>

<h2>Step-by-step brew guide</h2>
<p><strong>1. Rinse the filter.</strong> Place the three-layered side of the folded filter toward the spout. Pour hot water through to rinse out the papery taste and preheat the brewer. Discard the rinse water.</p>
<p><strong>2. Add your coffee and bloom.</strong> Pour 60 g of water (twice your coffee dose) over the grounds, saturating them evenly. Wait 45 seconds. This bloom lets CO₂ escape from freshly roasted beans — skipping it leads to uneven extraction.</p>
<p><strong>3. Pour in stages.</strong> After the bloom, pour in slow circles from the centre outward, keeping the water level between 2 and 4 cm below the rim. Add water every 45–60 seconds as the bed drains. Aim for 3–4 total pours.</p>
<p><strong>4. Finish at 4–5 minutes.</strong> If the brew finishes well under 4 minutes, the grind is too coarse. Over 5 minutes, go finer or reduce your dose slightly.</p>

<h2>Common problems and how to fix them</h2>
<h3>Bitter or harsh</h3>
<p>Almost always over-extraction. Grind coarser (move up one or two notches), reduce your water temperature by 2–3 degrees, or use a slightly lower dose. If the brew stalled and took over 6 minutes, the grind is the primary cause.</p>
<h3>Weak or watery</h3>
<p>Under-extraction. Grind finer, increase your dose to 32–34 g, or slow down your pour to give the water more contact time. Also check that you're using fresh coffee — beans more than 4 weeks past roast date extract less efficiently.</p>
<h3>Brew stalling completely</h3>
<p>Your grind is too fine and the filter has sealed against the glass. Grind noticeably coarser on your next brew. In the current brew, gently stir the slurry to break the seal — it will drain, but the flavour will be affected.</p>`,
  cbcHtml: `<p>When you finish a Chemex brew and it tastes off, Coffee Brew Coach walks you through a quick tasting session — you describe what you noticed (bitter, sour, weak, papery) and the app pinpoints whether the problem is grind size, water temperature, pour technique, or dose. Instead of guessing which variable to change, you get one targeted adjustment to make on the next brew.</p>
<p>Over time the app builds a history of every brew, so you can see exactly how your Chemex technique has improved bean by bean.</p>`,
  related: [
    { href: "/kalita-wave", label: "Kalita Wave brewing guide" },
    { href: "/cold-brew", label: "Cold brew coffee ratio guide" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
  ],
  ctaHeading: "Fix your next Chemex brew.",
});

/* ─── 2. Kalita Wave ─────────────────────────────────────────────────────── */

const kalitaHtml = page({
  path: "/kalita-wave",
  title: "Kalita Wave Brewing Guide | Coffee Brew Coach",
  description:
    "Master the Kalita Wave with the right grind, ratio, and pour technique. Get coaching from Coffee Brew Coach.",
  h1: "Kalita Wave brewing guide",
  lead:
    "The Kalita Wave's flat-bottom basket and three-hole drain are designed for consistent, forgiving extraction. Here's how to get the best out of it.",
  contentHtml: `
<h2>Why the Kalita Wave works differently</h2>
<p>Most pour-over drippers have a cone shape that concentrates water through a single point, making the extraction very sensitive to grind and pour speed. The Kalita Wave's flat bottom distributes water evenly across the entire coffee bed, and three small drain holes slow the flow just enough to increase contact time without stalling.</p>
<p>The wavy filter walls hold the filter off the dripper walls, so water can't find a shortcut around the coffee. This makes the Kalita Wave one of the most forgiving manual brewers — it produces a consistently balanced cup even when your pour isn't perfect.</p>

<h2>The recipe</h2>
<ul>
  <li><strong>Dose:</strong> 20 g coffee to 300 g water (1:15 ratio)</li>
  <li><strong>Grind:</strong> Medium-coarse — slightly finer than Chemex, slightly coarser than V60</li>
  <li><strong>Water temperature:</strong> 92–95 °C (198–203 °F)</li>
  <li><strong>Total brew time:</strong> 3:00–3:30 minutes</li>
</ul>

<h2>Step-by-step technique</h2>
<p><strong>1. Rinse the filter.</strong> Place a Kalita Wave filter in the dripper and pour hot water through it. This removes the papery flavour and preheats the brewer. Discard the rinse water.</p>
<p><strong>2. Bloom.</strong> Add your ground coffee and pour 40 g of water, making sure all the grounds are saturated. Wait 30–45 seconds. A good bloom means the grounds swell and bubble — a sign the coffee is fresh and CO₂ is being released.</p>
<p><strong>3. Pour in slow circles.</strong> From the centre outward, pour steadily, keeping the water level roughly 50 mm (2 inches) deep in the dripper. The key is to maintain a relatively constant water level — not too deep (over-extracts), not letting it drain completely between pours (under-extracts the top layer).</p>
<p><strong>4. Final pour.</strong> Complete your pours by 2:30, then allow the water to drain fully. Total time should be 3:00–3:30. If it drains faster than 3 minutes, grind finer. Slower than 4 minutes, grind coarser.</p>

<h2>Common problems</h2>
<h3>Sour or thin</h3>
<p>Usually under-extraction. Grind finer, use hotter water (95 °C instead of 92 °C), or increase your dose. Also check that your bloom fully saturated all the grounds — dry pockets cause uneven extraction.</p>
<h3>Bitter or harsh</h3>
<p>Over-extraction. Grind coarser, reduce water temperature, or lower the dose. If the brew took over 4 minutes, the grind is the primary cause.</p>
<h3>Flat or bland</h3>
<p>Often a freshness issue — beans more than 4–5 weeks past roast date will taste dull. Also try a longer bloom (45 seconds) and slightly hotter water to get more from the coffee.</p>`,
  cbcHtml: `<p>Coffee Brew Coach is built for exactly the trial-and-error cycle of dialling in a new coffee on your Kalita Wave. You log your recipe — dose, grind setting, water temperature, brew time — then rate how it tasted. The app identifies the variable most likely causing the problem and gives you one specific thing to change next brew.</p>
<p>It also tracks your brewing history by bean, so you can see the exact recipe that worked for a particular coffee when you buy it again.</p>`,
  related: [
    { href: "/chemex", label: "How to brew Chemex coffee" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
  ],
  ctaHeading: "Perfect your Kalita Wave.",
});

/* ─── 3. Moka Pot ────────────────────────────────────────────────────────── */

const mokaPotHtml = page({
  path: "/moka-pot",
  title: "Moka Pot Coffee Too Bitter? Here's Why | Coffee Brew Coach",
  description:
    "Fix bitter, burnt, or weak Moka pot coffee with these simple adjustments. Free coaching from Coffee Brew Coach.",
  h1: "Moka pot coffee too bitter — how to fix it",
  lead:
    "Bitter moka pot coffee is almost always caused by too much heat, the wrong grind, or letting the coffee sit on the stove too long. All three are easy to fix once you know what to look for.",
  contentHtml: `
<h2>Why moka pot coffee gets bitter</h2>
<p>The moka pot brews by forcing steam pressure through tightly packed coffee grounds at high temperature. This is efficient, but it means over-extraction happens faster than with any other brew method. Bitterness in moka pot coffee almost always traces back to one of three causes:</p>
<ul>
  <li><strong>Too much heat.</strong> High heat forces water through the coffee too aggressively, pulling out bitter compounds before the flavours have time to balance.</li>
  <li><strong>Grind too fine.</strong> An espresso-fine grind resists the water flow so much that the steam pressure rises dramatically, scorching the coffee.</li>
  <li><strong>Leaving it on the heat too long.</strong> The first few seconds of coffee that flows into the top chamber is the good stuff. Keep heating after that and the remaining liquid scorches.</li>
</ul>

<h2>The right technique</h2>
<p><strong>Grind:</strong> Medium-fine — like table salt, a notch coarser than espresso. Most grinder guides say "espresso" for a moka pot, but this is too fine and causes scorching. If your current grind packs solid under pressure, go coarser.</p>
<p><strong>Heat:</strong> Use medium-low heat. You want a slow, controlled flow of coffee into the top chamber — about 1–2 minutes from when you first see coffee bubbling up. A fast, sputtering flow means the heat is too high.</p>
<p><strong>Fill level:</strong> Fill the bottom chamber to just below the pressure valve. Do not compress the coffee grounds in the basket — the natural loose fill is enough. Tamping creates too much resistance and raises pressure to the point of scorching.</p>
<p><strong>Remove from heat early.</strong> As soon as you hear the gurgling change pitch — when it starts to sputter rather than flow smoothly — pull the moka pot off the heat. Run the bottom under cold water to stop extraction immediately.</p>

<h2>Other ways to reduce bitterness</h2>
<h3>Pre-heat the water</h3>
<p>Start with hot water already in the bottom chamber instead of cold. This reduces the time the coffee grounds spend at temperature before extraction begins, which cuts out one of the biggest sources of burnt flavour in moka pot brewing.</p>
<h3>Don't overfill the basket</h3>
<p>The filter basket should be level-full — not rounded, not compressed. Too much coffee creates excessive back-pressure and forces bitterness into the cup.</p>
<h3>Use fresh beans</h3>
<p>Dark, oily beans roasted more than 6 weeks ago are much more prone to bitter moka pot results. Medium-roast beans with a roast date within the last 4 weeks will give you more sweetness and less harshness.</p>`,
  cbcHtml: `<p>Coffee Brew Coach asks you to describe what your moka pot tasted like — the specific type of bitterness (sharp and acrid vs. heavy and flat), how fast the coffee flowed, and what heat level you used. Based on your description, it tells you exactly which variable caused the problem: the grind, the heat level, or the timing — and gives you one specific thing to change next brew.</p>`,
  related: [
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
    { href: "/espresso-pulling-too-fast", label: "Espresso pulling too fast — how to fix it" },
    { href: "/how-to-dial-in-espresso", label: "How to dial in espresso at home" },
  ],
  ctaHeading: "Fix your moka pot coffee.",
});

/* ─── 4. Cold Brew ───────────────────────────────────────────────────────── */

const coldBrewHtml = page({
  path: "/cold-brew",
  title: "Cold Brew Coffee Ratio and Brew Time Guide | Coffee Brew Coach",
  description:
    "Get the cold brew ratio, grind size, and steep time right every time. Free coaching from Coffee Brew Coach.",
  h1: "Cold brew coffee ratio — the complete guide",
  lead:
    "Cold brew ratio is the most important variable to get right. Too high a ratio and it's bitter and harsh; too low and it's watery and flat. Here's exactly what to use and why.",
  contentHtml: `
<h2>Understanding cold brew ratios</h2>
<p>Cold brew ratios are expressed as coffee to water by weight. The two common styles are:</p>
<ul>
  <li><strong>Concentrate (1:4 to 1:5):</strong> 100 g coffee to 400–500 g water. You dilute this 1:1 with water or milk before drinking. Strong, almost syrupy on its own.</li>
  <li><strong>Ready-to-drink (1:7 to 1:8):</strong> 100 g coffee to 700–800 g water. Drink it straight from the fridge with ice. Lighter, more delicate flavour.</li>
</ul>
<p>If you're unsure which to make, start with <strong>1:5 concentrate</strong> — it's the most flexible. You can dilute it as much or as little as you like, add it to milk, mix it into cocktails, or drink it straight over ice.</p>

<h2>The right grind size for cold brew</h2>
<p>Use a <strong>coarse grind</strong> — like cracked peppercorns or rough sea salt. Cold brew steeps for 12–24 hours. A coarse grind prevents over-extraction during that long contact time. If you grind too fine, the resulting coffee will be bitter and harsh even at low concentrations.</p>
<p>The difference between coarse and medium grind matters more in cold brew than almost any other method, because the long steep time magnifies even slight differences in extraction rate.</p>

<h2>Steep time and temperature</h2>
<p><strong>In the fridge (4 °C):</strong> Steep for 18–24 hours. Cold temperatures slow extraction significantly.</p>
<p><strong>At room temperature (20–22 °C):</strong> Steep for 12–14 hours. Faster extraction, slightly brighter flavour, but higher risk of sourness if left too long.</p>
<p>When in doubt, use the fridge. It's more forgiving and produces a consistently smooth result.</p>

<h2>Common problems</h2>
<h3>Bitter or harsh</h3>
<p>Over-extracted. Grind coarser, reduce steep time, or dilute more aggressively. If you steeped at room temperature, move to fridge steeping next time.</p>
<h3>Weak or watery</h3>
<p>Under-extracted. Increase your coffee dose (try 1:4 instead of 1:6), grind slightly finer (but still coarse), or extend the steep time by 4–6 hours.</p>
<h3>Sour or vegetal</h3>
<p>Very under-extracted. The water hasn't had enough contact time or the grind is too coarse. Steep longer or increase your ratio first before adjusting grind.</p>`,
  cbcHtml: `<p>Cold brew is simple but easy to get wrong because the 18-hour feedback loop means one bad batch costs you a full day. Coffee Brew Coach helps you log your recipe — ratio, grind setting, steep time, temperature — and when the batch is done, you rate the taste and get one targeted fix for the next one. Over a few batches, you'll dial in a recipe that works consistently with your beans and equipment.</p>`,
  related: [
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
    { href: "/chemex", label: "How to brew Chemex coffee" },
    { href: "/drip-machine", label: "Drip coffee maker tips" },
  ],
  ctaHeading: "Make better cold brew.",
});

/* ─── 5. Drip Machine ────────────────────────────────────────────────────── */

const dripMachineHtml = page({
  path: "/drip-machine",
  title: "Drip Coffee Maker Tips | Coffee Brew Coach",
  description:
    "Make better drip coffee with the right grind, ratio, and water temperature. Coaching from Coffee Brew Coach.",
  h1: "Drip coffee maker tips for a better cup",
  lead:
    "Most drip coffee makers are set up to produce mediocre coffee by default. A few simple changes to your ratio, grind, and maintenance routine will dramatically improve what you're getting.",
  contentHtml: `
<h2>The ratio problem</h2>
<p>The most common reason drip coffee tastes weak or bland is the wrong coffee-to-water ratio. Many machines and pre-packaged coffee pods are calibrated to a 1:18 ratio (55 g coffee per litre of water). Specialty coffee standards recommend <strong>1:15 to 1:16</strong> (60–66 g per litre).</p>
<p>The simplest improvement you can make to drip coffee is to add more coffee. If you're using the scoop that came with your machine, try one and a half scoops instead of one. If you weigh your coffee, target 60 g per litre of water.</p>

<h2>Water temperature matters more than you think</h2>
<p>Coffee extracts best between 91 and 96 °C (195–205 °F). Many inexpensive drip machines heat water to only 80–85 °C, which isn't hot enough to properly extract the sugars and aromatic compounds that make coffee taste full and sweet. The result is coffee that tastes sour, thin, or just plain flat despite a correct ratio.</p>
<p>If you can't control your machine's temperature, a simple test: brew a cup and if it tastes noticeably sour despite using enough coffee, temperature is likely the culprit. Look for a machine with a SCAA-certified brewing temperature, or pre-wet your grounds manually with a small amount of boiling water before brewing.</p>

<h2>Grind fresh</h2>
<p>Ground coffee starts losing aromatic compounds within 15–30 minutes of grinding. Pre-ground coffee in a bag has already lost most of its complexity by the time you open it. Even a basic blade grinder used right before brewing produces noticeably better coffee than pre-ground beans stored for weeks.</p>
<p>For a drip machine, use a <strong>medium grind</strong> — like beach sand. Too fine and the coffee is bitter and potentially plugs the filter; too coarse and it's weak and under-extracted.</p>

<h2>Clean your machine regularly</h2>
<p>Mineral scale from hard water accumulates on the heating element and affects both temperature and flow rate. Descale every 1–3 months depending on your water hardness. Run a cycle with equal parts white vinegar and water, followed by two cycles of plain water. You'll immediately notice the coffee brews hotter and faster.</p>
<p>Also rinse the carafe and basket after every use — old coffee oils left to oxidise will make your next brew taste rancid and bitter even if everything else is perfect.</p>

<h2>Use filtered water</h2>
<p>Tap water with high chlorine or mineral content noticeably affects coffee flavour. A simple Brita-style filter removes most of the compounds that interfere with coffee taste. Avoid using completely demineralised water — it actually extracts less efficiently than slightly mineralised water.</p>`,
  cbcHtml: `<p>Drip coffee is hard to troubleshoot because there are fewer variables to adjust than espresso or pour over. Coffee Brew Coach helps you identify whether the problem is your ratio, grind coarseness, bean freshness, or machine temperature — and gives you one specific thing to change, not a list of possibilities to experiment with blindly.</p>`,
  related: [
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
    { href: "/cold-brew", label: "Cold brew coffee ratio guide" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
  ],
  ctaHeading: "Better drip coffee starts here.",
});

/* ─── 6. Why does my coffee taste bitter ─────────────────────────────────── */

const bitterHtml = page({
  path: "/why-does-my-coffee-taste-bitter",
  title: "Why Does My Coffee Taste Bitter? | Coffee Brew Coach",
  description:
    "Bitter coffee is almost always over-extraction. Here's how to fix it for espresso, pour over, French press, and more.",
  h1: "Why does my coffee taste bitter?",
  lead:
    "Bitter coffee is almost always over-extraction — water has pulled too many compounds out of the grounds. But the cause of that over-extraction varies by brew method, and the fix is specific to each situation.",
  contentHtml: `
<h2>What causes bitter coffee</h2>
<p>Coffee contains hundreds of flavour compounds that extract at different rates. Acids and fruity notes extract first, sugars and body next, and finally bitter compounds. The goal is to stop extraction at the sweet spot — enough to get the good stuff, before the bitter compounds dominate.</p>
<p>Over-extraction happens when water spends too much time in contact with the grounds, when the water is too hot, or when the grind is too fine (creating more surface area). The bitter compounds are then extracted in excess, overwhelming the balanced flavours that were there earlier in the extraction.</p>

<h2>Most common causes by brew method</h2>
<h3>Espresso</h3>
<p>The most common cause is a grind that's too fine, creating too much resistance and extending extraction time. Other causes include: dose too low (under-dosed puck channels water through), shot running too long (over 35 seconds), or water temperature too high. Fix: grind coarser first. If the shot is still bitter and pulling in 25–30 seconds, lower your water temperature by 1–2 degrees.</p>
<h3>Pour over (V60, Chemex, Kalita Wave)</h3>
<p>Usually grind too fine, water too hot, or total brew time too long. Also check your pour technique — aggressive, fast pours agitate the grounds and accelerate extraction. Target 3–4 minutes total for most pour-over methods.</p>
<h3>French press</h3>
<p>Steeping too long is the primary cause. Most recipes say 4 minutes — leaving the plunger down for 8–10 minutes while you drink will continue extracting and turn the coffee bitter. Steep for 4 minutes, plunge, and pour immediately. Grind coarser if it's still bitter at 4 minutes.</p>
<h3>Moka pot</h3>
<p>Too much heat or too fine a grind. Use medium-low heat, start with pre-heated water, and grind medium-fine (not as fine as espresso). Remove from heat as soon as the flow slows to a sputter.</p>
<h3>Drip machine</h3>
<p>Grind too fine, too much coffee, or old coffee oils in a dirty machine. Clean the machine (descale and rinse the carafe), use a medium grind, and check your ratio isn't higher than 1:15.</p>

<h2>Quick checklist: fix bitter coffee</h2>
<ul>
  <li>✓ Grind coarser (most likely fix for almost every method)</li>
  <li>✓ Reduce water temperature by 2–3 °C</li>
  <li>✓ Shorten extraction time (faster pour, shorter steep)</li>
  <li>✓ Reduce dose slightly</li>
  <li>✓ Use fresher beans — very stale beans are inherently more bitter</li>
  <li>✓ Clean your equipment — old coffee residue adds harsh bitterness</li>
</ul>`,
  cbcHtml: `<p>Coffee Brew Coach diagnoses bitterness by cross-referencing the specific type of bitterness you describe with your brew method, grind setting, and extraction time. Harsh and sharp bitterness points to different causes than heavy, flat bitterness — and the fixes are different. The app tells you which variable to change first, so you're not guessing.</p>`,
  related: [
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
    { href: "/how-to-dial-in-espresso", label: "How to dial in espresso at home" },
    { href: "/espresso-pulling-too-fast", label: "Espresso pulling too fast — how to fix it" },
  ],
  ctaHeading: "Get one specific fix for bitter coffee.",
});

/* ─── 7. Espresso pulling too fast ───────────────────────────────────────── */

const espressoFastHtml = page({
  path: "/espresso-pulling-too-fast",
  title: "Espresso Pulling Too Fast? Here's the Fix | Coffee Brew Coach",
  description:
    "If your espresso pulls in under 20 seconds it's under-extracted. Here's exactly what to adjust to fix it.",
  h1: "Espresso pulling too fast — how to fix it",
  lead:
    "A fast espresso shot — one that finishes in under 20 seconds — is under-extracted. The coffee will taste sour, thin, and weak. Here's a systematic way to fix it.",
  contentHtml: `
<h2>What is a fast shot?</h2>
<p>A properly extracted espresso should take <strong>25–35 seconds</strong> from the moment the pump starts to when you stop the shot. This is measured from when water first contacts the coffee puck (not when coffee starts flowing from the spout — there's typically a 5–8 second delay).</p>
<p>If your shot finishes before 20 seconds, water is rushing through the puck too quickly, extracting only the first, easiest-to-reach compounds — which are sour and thin — and missing the balanced, sweet middle of the extraction curve.</p>

<h2>Why shots pull fast</h2>
<ul>
  <li><strong>Grind too coarse:</strong> The most common cause. Large particles offer less resistance, so water rushes straight through.</li>
  <li><strong>Dose too low:</strong> Less coffee in the basket means the puck is thinner and creates less resistance.</li>
  <li><strong>Tamp too light:</strong> A loose puck lets water find channels through the coffee rather than percolating evenly.</li>
  <li><strong>Channelling:</strong> A crack or hole in the puck lets water short-circuit through one path. The shot pulls fast but looks normal until you inspect the spent puck.</li>
  <li><strong>Distribution problems:</strong> If the coffee isn't evenly distributed before tamping, thin spots in the puck create low-resistance paths.</li>
</ul>

<h2>How to fix it — in order</h2>
<p><strong>Step 1: Grind finer.</strong> This is almost always the right first move. Move your grinder one or two notches finer and pull another shot. The flow should slow and the shot should take longer. Continue adjusting until you hit 25–35 seconds.</p>
<p><strong>Step 2: Check your dose.</strong> If grinding finer alone doesn't slow the shot enough, increase your dose by 0.5 g and try again. Most espresso recipes use 18–20 g for a double shot.</p>
<p><strong>Step 3: Improve your tamp.</strong> Use firm, even pressure — roughly 15 kg. More importantly, make sure the tamp is level. An uneven tamp creates a thin edge where water channelled through. Use a levelling tool if available.</p>
<p><strong>Step 4: Distribute before tamping.</strong> Use a WDT tool (Weiss Distribution Technique) or simply tap the portafilter on the counter a few times to settle the grounds evenly before tamping. This eliminates channels and clumps before they become a problem.</p>

<h2>What a dialled-in shot looks like</h2>
<p>A properly extracted espresso starts as a slow drip 5–8 seconds after the pump starts, then builds to a steady, honey-like flow. The colour should be a warm amber-brown — not pale yellow (under-extracted, too fast) and not dark brown that fades to black (over-extracted, too slow). Aim for 25–35 seconds total and a yield of roughly 1.5–2× your dose weight.</p>`,
  cbcHtml: `<p>Coffee Brew Coach is built for exactly this kind of systematic espresso troubleshooting. You log your shot time, yield, and dose, then describe the taste — sour, thin, sharp, weak. The app tells you whether the primary cause is grind, dose, tamp, or distribution, and gives you one specific number to change on the next shot rather than suggesting you experiment with everything at once.</p>`,
  related: [
    { href: "/how-to-dial-in-espresso", label: "How to dial in espresso at home" },
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
  ],
  ctaHeading: "Perfect your espresso shot.",
});

/* ─── 8. Coffee grind size guide ─────────────────────────────────────────── */

const grindSizeHtml = page({
  path: "/coffee-grind-size-guide",
  title: "Coffee Grind Size Guide | Coffee Brew Coach",
  description:
    "The complete grind size guide for every brew method — espresso, V60, AeroPress, French press, cold brew and more.",
  h1: "Coffee grind size guide",
  lead:
    "Grind size is the most powerful variable in coffee extraction. Use the wrong grind and no amount of ratio or temperature adjustment will fix the cup. Here's what grind to use for every method.",
  contentHtml: `
<h2>Why grind size matters</h2>
<p>When you grind coffee, you're breaking beans into particles that water flows through and extracts from. Finer particles have more surface area, so they extract faster. Coarser particles have less surface area, so they extract slower.</p>
<p>Every brew method has a target extraction time. The grind size you use should produce the right extraction rate for that target. If you use espresso-fine grounds in a French press, the 4-minute steep will massively over-extract and taste unbearably bitter. If you use French press-coarse grounds in an espresso machine, the 25-second shot will barely extract anything and taste like sour water.</p>

<h2>Grind size chart</h2>
<table class="grind-table">
  <thead>
    <tr><th>Grind level</th><th>Visual reference</th><th>Methods</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Extra fine</strong></td><td>Flour or powdered sugar</td><td>Turkish coffee</td></tr>
    <tr><td><strong>Fine</strong></td><td>Icing sugar / very fine sand</td><td>Espresso</td></tr>
    <tr><td><strong>Medium-fine</strong></td><td>Table salt</td><td>Moka pot, AeroPress (espresso-style)</td></tr>
    <tr><td><strong>Medium</strong></td><td>Beach sand / sea salt</td><td>Drip machine, AeroPress (standard), Siphon</td></tr>
    <tr><td><strong>Medium-coarse</strong></td><td>Rough sand</td><td>V60, Kalita Wave</td></tr>
    <tr><td><strong>Coarse</strong></td><td>Raw cane sugar</td><td>Chemex, French press</td></tr>
    <tr><td><strong>Extra coarse</strong></td><td>Cracked peppercorns</td><td>Cold brew</td></tr>
  </tbody>
</table>

<h2>How to tell if your grind is right</h2>
<p>The best feedback is the taste of the coffee combined with the extraction time. For most methods:</p>
<ul>
  <li><strong>Too fine:</strong> Bitter, harsh, over-extracted. Extraction time longer than target. Slow flow or clogged filter.</li>
  <li><strong>Too coarse:</strong> Sour, thin, weak, under-extracted. Extraction time shorter than target. Very fast flow.</li>
  <li><strong>Just right:</strong> Balanced, sweet, full-bodied. Hits the target extraction time.</li>
</ul>

<h2>Grinder quality and consistency</h2>
<p>Consumer blade grinders produce inconsistent particle sizes — a mix of very fine dust and large chunks. This makes the resulting coffee taste simultaneously over- and under-extracted (muddy, with competing sour and bitter notes). Even an entry-level burr grinder produces significantly more consistent particle sizes and dramatically better coffee.</p>
<p>If you're using a burr grinder, adjust in small increments — one or two numbers at a time. Each step changes the grind meaningfully. Jumping across multiple settings at once makes it impossible to know which change caused the improvement.</p>

<h2>Method-specific notes</h2>
<h3>Espresso</h3>
<p>Espresso grind requires the most precision of any method. A single step on most grinders changes shot time by 3–5 seconds. Dial in by adjusting in very small increments and measuring shot time and yield precisely.</p>
<h3>AeroPress</h3>
<p>The AeroPress is the most flexible method — it works well from medium-fine to medium depending on steep time and plunge speed. Longer steeps with coarser grinds, shorter steeps with finer grinds.</p>
<h3>French press</h3>
<p>Use a coarse grind and press at exactly 4 minutes. Pour immediately after pressing — leaving the plunger down allows the grounds to continue extracting even after pressing.</p>`,
  cbcHtml: `<p>Coffee Brew Coach helps you identify grind problems from taste alone. You don't need to know your exact grind setting — you describe the taste, the brew time, and the flow characteristics, and the app tells you whether to grind finer or coarser and by approximately how much. It tracks your adjustments over time so you can see exactly where you landed for each coffee and method.</p>`,
  related: [
    { href: "/how-to-dial-in-espresso", label: "How to dial in espresso at home" },
    { href: "/aeropress-too-weak", label: "AeroPress coffee too weak — fix it" },
    { href: "/cold-brew", label: "Cold brew coffee ratio guide" },
  ],
  ctaHeading: "Find the right grind for your brew.",
});

/* ─── 9. How to dial in espresso ─────────────────────────────────────────── */

const dialInEspressoHtml = page({
  path: "/how-to-dial-in-espresso",
  title: "How to Dial In Espresso at Home | Coffee Brew Coach",
  description:
    "Step-by-step guide to dialling in espresso — grind, dose, yield, and timing. Get instant coaching from Coffee Brew Coach.",
  h1: "How to dial in espresso at home",
  lead:
    "Dialling in espresso means systematically adjusting your variables until each shot tastes balanced and repeatable. It's not complicated — but you need to know which variable to change first.",
  contentHtml: `
<h2>What dialling in actually means</h2>
<p>Espresso has three main variables: <strong>grind size</strong>, <strong>dose</strong> (how much coffee), and <strong>yield</strong> (how much liquid espresso). These interact with each other — changing one affects how the others behave. Dialling in is the process of finding the combination that produces a balanced, sweet, repeatable shot.</p>
<p>Most home baristas make the mistake of changing multiple variables at once. This makes it impossible to know which change helped. The rule: <strong>change one variable at a time</strong>, pull a shot, taste it, and evaluate before changing anything else.</p>

<h2>The starting recipe</h2>
<p>If you're starting from scratch with a new coffee, use this recipe as your baseline:</p>
<ul>
  <li><strong>Dose:</strong> 18 g (double shot basket)</li>
  <li><strong>Yield:</strong> 36 g (2× your dose weight)</li>
  <li><strong>Time:</strong> 25–30 seconds from pump start</li>
  <li><strong>Water temperature:</strong> 93 °C (199 °F)</li>
</ul>
<p>This 1:2 ratio (dose to yield) is a solid starting point for most medium-roast coffees. Light roasts often benefit from a slightly longer yield (1:2.2 to 1:2.5). Dark roasts often taste better with a shorter yield (1:1.8 to 1:2).</p>

<h2>Which variable to change first: always grind</h2>
<p>Grind size is your primary dial. Keep dose and yield constant and adjust grind until the shot takes 25–30 seconds. Don't touch dose or yield until grind is dialled in.</p>
<ul>
  <li><strong>Shot pulls in under 20 seconds:</strong> Grind finer</li>
  <li><strong>Shot pulls in over 35 seconds:</strong> Grind coarser</li>
  <li><strong>Shot pulls in 25–30 seconds but tastes sour:</strong> Grind finer (extract more)</li>
  <li><strong>Shot pulls in 25–30 seconds but tastes bitter:</strong> Grind coarser (extract less)</li>
</ul>

<h2>Using taste to guide your adjustments</h2>
<p><strong>Sour or sharp:</strong> Under-extracted. Grind finer (increases extraction). If you're already hitting target time, try increasing your yield by a few grams.</p>
<p><strong>Bitter or harsh:</strong> Over-extracted. Grind coarser (decreases extraction). If time is already correct, reduce your yield by a few grams or lower water temperature 1–2 degrees.</p>
<p><strong>Weak or watery:</strong> Both under-extracted AND under-dosed. First grind finer, then if it's still thin, increase dose by 0.5 g.</p>
<p><strong>Balanced but needs more body:</strong> Reduce yield slightly (shorter shot). This concentrates the flavour.</p>

<h2>When to adjust dose</h2>
<p>Only adjust dose after grind is dialled in. Dose affects body and strength more than flavour balance. If the shot is balanced but light-bodied, add 0.5 g. If it's balanced but too intense, reduce by 0.5 g. Dose adjustments in espresso are very small — changes of more than 1 g at a time will significantly alter the shot.</p>

<h2>Keeping notes</h2>
<p>Write down every shot: grind setting, dose, yield, time, and a taste note. Without notes you'll forget what worked and repeat the same mistakes. You only need two or three shots to dial in most coffees — with notes. Without notes, you can chase the same problem for weeks.</p>`,
  cbcHtml: `<p>Coffee Brew Coach is designed specifically for the espresso dialling-in process. Log your dose, yield, shot time, and grind setting, then describe the taste. The app tells you exactly which variable to change and by approximately how much. It stores your brewing history by bean, so when you buy the same coffee again, you can start from where you left off instead of starting from scratch.</p>`,
  related: [
    { href: "/espresso-pulling-too-fast", label: "Espresso pulling too fast — how to fix it" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
  ],
  ctaHeading: "Pull better espresso, faster.",
});

/* ─── 10. AeroPress too weak ─────────────────────────────────────────────── */

const aeropressWeakHtml = page({
  path: "/aeropress-too-weak",
  title: "AeroPress Coffee Too Weak? Here's the Fix | Coffee Brew Coach",
  description:
    "Weak AeroPress coffee is usually grind size or steep time. Here's exactly how to fix it and brew stronger, better coffee.",
  h1: "AeroPress coffee too weak — how to fix it",
  lead:
    "Weak AeroPress coffee is a solvable problem. It comes down to one or more of four causes: too much water, not enough coffee, a grind that's too coarse, or a steep time that's too short.",
  contentHtml: `
<h2>Why AeroPress coffee turns out weak</h2>
<p>The AeroPress is incredibly versatile, which also means there are more ways to make it wrong. Weak, watery AeroPress coffee is almost always under-extraction — the water hasn't pulled enough of the good compounds out of the grounds. There are four main reasons this happens.</p>

<h2>The four causes of weak AeroPress coffee</h2>
<h3>1. Too much water (wrong ratio)</h3>
<p>This is the most common cause. If you're filling the AeroPress to the "4" mark with a single scoop of coffee, you're using a very diluted ratio — approximately 1:18 or weaker. A good AeroPress ratio is <strong>1:12 to 1:15</strong>: 15–17 g of coffee to 200 ml of water. Try reducing your water volume or increasing your coffee dose.</p>
<h3>2. Grind too coarse</h3>
<p>A coarse grind has less surface area, so it extracts less in a short steep. For a standard AeroPress brew, use a <strong>medium grind</strong> — like beach sand. If you've been using a grind closer to French press coarseness, go finer by two or three notches on your grinder.</p>
<h3>3. Steep time too short</h3>
<p>Many AeroPress recipes call for pressing after just 30–60 seconds. That's fine with a fine grind, but with a medium grind you need closer to 1–2 minutes of steep time. Extend your steep before you change anything else and see if the flavour improves.</p>
<h3>4. Water not hot enough</h3>
<p>Some guides recommend using 80 °C water for AeroPress. While this works with very light, acidic coffees, most beans extract better between 88–95 °C. If your AeroPress tastes sour and weak at the same time, low temperature is often the cause. Try hotter water — 90–92 °C — and see if the flavour fills out.</p>

<h2>The fix: start here</h2>
<p>Change one thing at a time. Start with ratio — increase your coffee dose by 2–3 g and brew again. If still weak, try a finer grind. If still weak after that, extend your steep time to 90–120 seconds. Temperature is usually only the problem if you've already ruled out the others.</p>

<h2>A reliable AeroPress recipe</h2>
<ul>
  <li><strong>Coffee:</strong> 16 g</li>
  <li><strong>Water:</strong> 220 g at 92 °C</li>
  <li><strong>Grind:</strong> Medium (like sea salt)</li>
  <li><strong>Steep:</strong> 1 minute, then plunge slowly over 30 seconds</li>
  <li><strong>Ratio:</strong> 1:13.75</li>
</ul>
<p>This produces a strong, concentrated cup that you can drink straight or top up with a little hot water to taste. Start here and adjust one variable at a time based on how it tastes.</p>

<h2>Inverted AeroPress</h2>
<p>The inverted method (placing the AeroPress upside down while steeping) prevents any drip-through during the steep, giving you full contact time between the coffee and water. If your standard AeroPress keeps coming out weak, try the inverted method — you'll notice the difference immediately because none of the brew escapes before you're ready.</p>`,
  cbcHtml: `<p>Coffee Brew Coach asks you the right questions to diagnose weak AeroPress coffee: your dose, water volume, grind setting, steep time, and water temperature. Based on your answers, it identifies which variable is most likely causing the problem and gives you one specific change to make. You don't have to guess whether it's the ratio, the grind, or the time — the app tells you.</p>`,
  related: [
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
    { href: "/cold-brew", label: "Cold brew coffee ratio guide" },
    { href: "/drip-machine", label: "Drip coffee maker tips" },
  ],
  ctaHeading: "Fix your AeroPress coffee.",
});

/* ─── 11. French Press ───────────────────────────────────────────────────── */

const frenchPressHtml = page({
  path: "/french-press",
  title: "French Press Coffee — Brew Guide and Fixes | Coffee Brew Coach",
  description:
    "Fix bitter, weak, or muddy French press coffee. The right grind, steep time, and ratio for a perfect cup every time.",
  h1: "French Press Coffee — How to Brew and Troubleshoot",
  lead:
    "French press is one of the most forgiving brew methods — but it's easy to end up with bitter, muddy, or weak coffee if you get the grind, steep time, or ratio wrong. This guide covers exactly how to fix it.",
  contentHtml: `
<h2>Why French press is different</h2>
<p>Unlike filtered methods (pour over, drip machine), French press keeps the coffee grounds in contact with water for the entire steep and uses a metal mesh filter rather than paper. This means the coffee oils and fine particles stay in the cup, giving French press its characteristic full body and rich texture.</p>
<p>The metal filter doesn't trap fine particles the way paper does. If you grind too fine, you'll end up with a layer of sludge at the bottom and a cup that turns bitter as it sits. Coarse grind is not optional with French press — it's essential.</p>

<h2>The recipe</h2>
<ul>
  <li><strong>Dose:</strong> 60–65 g coffee per litre of water (1:15 to 1:16 ratio)</li>
  <li><strong>Grind:</strong> Coarse — like raw cane sugar or rough sea salt</li>
  <li><strong>Water temperature:</strong> 93–96 °C (200–205 °F)</li>
  <li><strong>Steep time:</strong> 4 minutes exactly</li>
</ul>
<p>The coarse grind is essential. French press steeps for 4 full minutes — if you grind to a medium or fine setting, that contact time will massively over-extract and produce harsh bitterness. When in doubt, grind coarser.</p>

<h2>Step-by-step brew guide</h2>
<p><strong>1. Preheat the press.</strong> Add a small amount of hot water, swirl it around, and discard. This prevents temperature drop when you add your brew water.</p>
<p><strong>2. Add ground coffee.</strong> Use freshly ground coffee if possible. Add your dose and give the press a gentle shake to level the grounds.</p>
<p><strong>3. Start your timer and pour.</strong> Pour all the water in one go, making sure all grounds are submerged. Give it one gentle stir to ensure even saturation. Place the lid on top with the plunger pulled all the way up — do not press yet.</p>
<p><strong>4. Steep for exactly 4 minutes.</strong> This is the most important step. Set a timer. Steeping for too long is the single most common cause of bitter French press coffee.</p>
<p><strong>5. Press slowly.</strong> At 4 minutes, press the plunger down using firm, steady pressure over about 20–30 seconds. Don't press too fast — aggressive plunging forces fine particles through the filter.</p>
<p><strong>6. Pour immediately.</strong> Don't leave coffee sitting in the press after plunging. The grounds continue extracting even after the plunger is down. Pour into a cup or carafe right away.</p>

<h2>French press coffee too bitter — how to fix it</h2>
<h3>Grind coarser</h3>
<p>This fixes the vast majority of bitter French press coffee. If your grind looks anything like table salt or beach sand, it's too fine. Move to a coarse setting where the particles look like raw cane sugar. This single change reduces bitterness more than any other adjustment.</p>
<h3>Reduce steep time</h3>
<p>If you're steeping longer than 4 minutes, the grounds continue extracting bitter compounds. Set a timer and plunge at exactly 4 minutes. If it's still bitter at 4 minutes with a coarse grind, try 3:30.</p>
<h3>Lower your water temperature</h3>
<p>Water above 97 °C accelerates extraction and can scorch the coffee. Let boiling water sit for 30–60 seconds before pouring, or target 93–95 °C with a temperature-controlled kettle.</p>

<h2>French press coffee too weak — how to fix it</h2>
<h3>Use more coffee</h3>
<p>The most common cause of weak French press is not enough coffee. Many standard recipes under-dose to around 1:18 or 1:20 ratios. Move to 60–65 g per litre and the difference is immediate.</p>
<h3>Grind slightly finer</h3>
<p>If you're already using the right amount of coffee and it still tastes thin, try one step finer on your grinder. Aim for slightly coarse — not extremely coarse.</p>

<h2>Why is my French press muddy?</h2>
<p>A muddy cup — thick with sludge — usually means the grind is too fine and fine particles are passing through the metal filter. Grind coarser and press more slowly. Also check that your filter mesh isn't damaged or worn, which would allow more particles through than normal.</p>`,
  cbcHtml: `<p>French press troubleshooting is exactly what Coffee Brew Coach is built for. You describe what went wrong — bitter, muddy, weak, flat — and the app identifies the specific cause based on your grind setting, steep time, and ratio. Instead of guessing whether to adjust grind, steep time, or dose, you get one targeted change to make on the next brew.</p>
<p>Coffee Brew Coach also tracks your French press history brew by brew, so you can see exactly when a recipe clicked and replicate it with any new coffee you try.</p>`,
  related: [
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
    { href: "/cold-brew", label: "Cold brew coffee ratio guide" },
  ],
  ctaHeading: "Fix your French press coffee.",
});

/* ─── Structured data ────────────────────────────────────────────────────── */

const STRUCTURED_DATA: Record<string, object> = {
  "/chemex": {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to brew Chemex coffee",
    "description": "How to brew Chemex coffee and fix common problems — weak, bitter, or slow extraction.",
    "totalTime": "PT5M",
    "step": [
      { "@type": "HowToStep", "position": 1, "name": "Rinse the filter", "text": "Place the three-layered side of the folded filter toward the spout. Pour hot water through to rinse out the papery taste and preheat the brewer. Discard the rinse water." },
      { "@type": "HowToStep", "position": 2, "name": "Add your coffee and bloom", "text": "Pour 60 g of water (twice your coffee dose) over the grounds, saturating them evenly. Wait 45 seconds to let CO₂ escape from freshly roasted beans." },
      { "@type": "HowToStep", "position": 3, "name": "Pour in stages", "text": "Pour in slow circles from the centre outward, keeping the water level between 2 and 4 cm below the rim. Add water every 45–60 seconds as the bed drains. Aim for 3–4 total pours." },
      { "@type": "HowToStep", "position": 4, "name": "Finish at 4–5 minutes", "text": "Allow the brew to complete. Target total brew time is 4–5 minutes. If it finishes under 4 minutes, grind coarser next time. Over 5 minutes, grind finer." },
    ],
  },
  "/kalita-wave": {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Kalita Wave brewing guide",
    "description": "Master the Kalita Wave with the right grind, ratio, and pour technique.",
    "totalTime": "PT3M30S",
    "step": [
      { "@type": "HowToStep", "position": 1, "name": "Rinse the filter", "text": "Place a Kalita Wave filter in the dripper and pour hot water through it to remove papery flavour and preheat the brewer. Discard the rinse water." },
      { "@type": "HowToStep", "position": 2, "name": "Bloom", "text": "Add your ground coffee and pour 40 g of water, making sure all the grounds are saturated. Wait 30–45 seconds." },
      { "@type": "HowToStep", "position": 3, "name": "Pour in slow circles", "text": "From the centre outward, pour steadily, keeping the water level roughly 50 mm deep in the dripper. Maintain a relatively constant water level throughout." },
      { "@type": "HowToStep", "position": 4, "name": "Final pour", "text": "Complete your pours by 2:30, then allow the water to drain fully. Total time should be 3:00–3:30. Grind finer if it drains faster than 3 minutes, coarser if slower than 4 minutes." },
    ],
  },
  "/french-press": {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to brew French press coffee",
    "description": "Fix bitter, weak, or muddy French press coffee with the right grind, steep time, and ratio.",
    "totalTime": "PT4M",
    "step": [
      { "@type": "HowToStep", "position": 1, "name": "Preheat the press", "text": "Add a small amount of hot water, swirl it around, and discard to prevent temperature drop when you add your brew water." },
      { "@type": "HowToStep", "position": 2, "name": "Add ground coffee", "text": "Add your dose of freshly ground coarse coffee and give the press a gentle shake to level the grounds." },
      { "@type": "HowToStep", "position": 3, "name": "Pour and start timer", "text": "Pour all the water in one go, making sure all grounds are submerged. Give it one gentle stir. Place the lid on with the plunger pulled all the way up — do not press yet." },
      { "@type": "HowToStep", "position": 4, "name": "Steep for exactly 4 minutes", "text": "Set a timer and wait exactly 4 minutes. Steeping longer is the single most common cause of bitter French press coffee." },
      { "@type": "HowToStep", "position": 5, "name": "Press slowly", "text": "At 4 minutes, press the plunger down using firm, steady pressure over about 20–30 seconds. Don't press too fast." },
      { "@type": "HowToStep", "position": 6, "name": "Pour immediately", "text": "Don't leave coffee sitting in the press after plunging — grounds continue extracting. Pour into a cup or carafe right away." },
    ],
  },
  "/how-to-dial-in-espresso": {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to dial in espresso at home",
    "description": "Step-by-step guide to dialling in espresso — grind, dose, yield, and timing.",
    "step": [
      { "@type": "HowToStep", "position": 1, "name": "Start with the baseline recipe", "text": "Use 18 g dose, 36 g yield (2× dose weight), 25–30 seconds from pump start, water at 93 °C. This 1:2 ratio is a solid starting point for most medium-roast coffees." },
      { "@type": "HowToStep", "position": 2, "name": "Adjust grind first", "text": "Keep dose and yield constant. Adjust grind until the shot takes 25–30 seconds. Grind finer if shot pulls under 20 seconds; coarser if over 35 seconds." },
      { "@type": "HowToStep", "position": 3, "name": "Use taste to guide adjustments", "text": "Sour or sharp means under-extracted — grind finer. Bitter or harsh means over-extracted — grind coarser. Weak means under-extracted and under-dosed." },
      { "@type": "HowToStep", "position": 4, "name": "Adjust dose after grind is dialled in", "text": "Once grind is correct, fine-tune dose in 0.5 g increments to adjust body and strength. Changes above 1 g significantly alter the shot." },
      { "@type": "HowToStep", "position": 5, "name": "Keep notes on every shot", "text": "Record grind setting, dose, yield, time, and a taste note. You only need 2–3 shots to dial in most coffees with notes. Without notes you'll repeat the same mistakes." },
    ],
  },
  "/why-does-my-coffee-taste-bitter": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Why does my espresso taste bitter?", "acceptedAnswer": { "@type": "Answer", "text": "The most common cause is a grind that's too fine, extending extraction time. Grind coarser first. If the shot is still bitter and pulling in 25–30 seconds, lower your water temperature by 1–2 degrees." } },
      { "@type": "Question", "name": "Why does my pour over coffee taste bitter?", "acceptedAnswer": { "@type": "Answer", "text": "Usually grind too fine, water too hot, or total brew time too long. Target 3–4 minutes total and grind coarser if the cup is harsh. Also avoid fast, aggressive pours that agitate the grounds." } },
      { "@type": "Question", "name": "Why does my French press taste bitter?", "acceptedAnswer": { "@type": "Answer", "text": "Steeping too long is the primary cause. Steep for exactly 4 minutes, plunge, and pour immediately. Grind coarser if it's still bitter at 4 minutes." } },
      { "@type": "Question", "name": "Why does my moka pot coffee taste bitter?", "acceptedAnswer": { "@type": "Answer", "text": "Too much heat or too fine a grind. Use medium-low heat, start with pre-heated water, and grind medium-fine. Remove from heat as soon as the flow slows to a sputter." } },
      { "@type": "Question", "name": "What is the quickest fix for bitter coffee?", "acceptedAnswer": { "@type": "Answer", "text": "Grind coarser — this is the most likely fix for almost every method. Then try reducing water temperature by 2–3 °C and shortening extraction time." } },
    ],
  },
  "/espresso-pulling-too-fast": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Why is my espresso pulling too fast?", "acceptedAnswer": { "@type": "Answer", "text": "The most common cause is a grind that's too coarse. Other causes include: dose too low, tamp too light, channelling in the puck, or uneven coffee distribution before tamping." } },
      { "@type": "Question", "name": "How long should an espresso shot take?", "acceptedAnswer": { "@type": "Answer", "text": "A properly extracted espresso should take 25–35 seconds from when the pump starts. If your shot finishes before 20 seconds, it's under-extracted and will taste sour and thin." } },
      { "@type": "Question", "name": "How do I fix a fast espresso shot?", "acceptedAnswer": { "@type": "Answer", "text": "Step 1: grind finer. Step 2: if still too fast, increase dose by 0.5 g. Step 3: ensure your tamp is firm and level (about 15 kg pressure). Step 4: distribute grounds evenly before tamping using a WDT tool or by tapping the portafilter." } },
      { "@type": "Question", "name": "What does under-extracted espresso taste like?", "acceptedAnswer": { "@type": "Answer", "text": "Under-extracted espresso tastes sour, thin, and weak. The colour will be pale yellow rather than warm amber-brown. Shots that pull in under 20 seconds are almost always under-extracted." } },
    ],
  },
  "/aeropress-too-weak": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Why is my AeroPress coffee weak?", "acceptedAnswer": { "@type": "Answer", "text": "Weak AeroPress coffee is almost always under-extraction caused by one of four things: too much water (wrong ratio), grind too coarse, steep time too short, or water not hot enough." } },
      { "@type": "Question", "name": "What is the best AeroPress ratio?", "acceptedAnswer": { "@type": "Answer", "text": "A good AeroPress ratio is 1:12 to 1:15 — 15–17 g of coffee to 200 ml of water. Many weak cups use a diluted 1:18 ratio. Try 16 g coffee to 220 g water as a starting point." } },
      { "@type": "Question", "name": "How long should I steep AeroPress?", "acceptedAnswer": { "@type": "Answer", "text": "With a medium grind, steep for 1–2 minutes before plunging slowly over 30 seconds. Steeping for only 30–60 seconds with a medium grind produces weak coffee." } },
      { "@type": "Question", "name": "What grind size should I use for AeroPress?", "acceptedAnswer": { "@type": "Answer", "text": "For a standard AeroPress brew, use a medium grind — like beach sand or sea salt. If you have been using a French press-coarse grind, go two or three notches finer on your grinder." } },
    ],
  },
  "/how-coffee-youtubers-make-money": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How Coffee YouTubers Make Money",
    "description":
      "How coffee YouTubers and content creators actually earn income — sponsorships, gear affiliate links, and recurring commission affiliate programs like Coffee Brew Coach's.",
    "datePublished": "2026-07-06",
    "dateModified": "2026-07-06",
    "author": { "@type": "Organization", "name": "Coffee Brew Coach" },
    "publisher": { "@type": "Organization", "name": "Coffee Brew Coach" },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://www.coffeebrew.coach/how-coffee-youtubers-make-money",
    },
  },
  "/best-affiliate-programs-for-coffee-creators": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Best Affiliate Programs for Coffee Content Creators",
    "description":
      "A comparison of affiliate programs for coffee content creators — one-time gear commissions vs. recurring commission programs like Coffee Brew Coach's affiliate program.",
    "datePublished": "2026-07-06",
    "dateModified": "2026-07-06",
    "author": { "@type": "Organization", "name": "Coffee Brew Coach" },
    "publisher": { "@type": "Organization", "name": "Coffee Brew Coach" },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://www.coffeebrew.coach/best-affiliate-programs-for-coffee-creators",
    },
  },
};

/* ─── 12. How coffee YouTubers make money ───────────────────────────────── */

const youtuberMoneyHtml = page({
  path: "/how-coffee-youtubers-make-money",
  title: "How Coffee YouTubers Make Money | Coffee Brew Coach",
  description:
    "How coffee YouTubers and content creators actually earn income — sponsorships, gear affiliate links, and recurring commission affiliate programs like Coffee Brew Coach's.",
  h1: "How coffee YouTubers make money",
  lead:
    "Coffee content creators rarely rely on a single income stream. Here's a breakdown of how working coffee YouTubers, TikTokers, and newsletter writers actually monetize their audience — and where recurring commissions fit in.",
  contentHtml: `
<h2>Brand sponsorships</h2>
<p>Direct sponsorships from roasters, grinder makers, and espresso machine brands are the most visible income source for larger channels. They pay well per video but are inconsistent — you're re-negotiating every deal, and income disappears the moment you stop posting sponsored content.</p>

<h2>Gear affiliate links (one-time commission)</h2>
<p>Amazon Associates and similar programs are the most common starting point: you link to a grinder or scale, and earn a small percentage on that single purchase. It's easy to set up but the commission is a one-time payout — refer the same viewer twice and you only get paid once, and rates are typically 1–4%.</p>

<h2>Ad revenue</h2>
<p>Platform ad revenue (YouTube, TikTok Creator Fund) scales with views, not with how useful your content actually is to the viewer. It also requires meaningful watch time thresholds most niche coffee channels never reach.</p>

<h2>Recurring commission affiliate programs</h2>
<p>A newer model — and the one that best matches how coffee content actually works — is a <strong>recurring commission affiliate program</strong>. Instead of a one-time cut of a single gear purchase, you earn a commission every month a subscriber you referred stays active. If your audience is already asking "why does my espresso taste bitter" or "how do I dial in my grinder," recommending a coaching app is a natural fit, not a hard sell.</p>
<p><a href="/affiliate/become">Coffee Brew Coach's affiliate program</a> works this way: you get paid monthly for every Pro subscriber you refer, for as long as they stay subscribed, with your rate automatically increasing as more of your referrals convert. A single well-placed mention in a video description can keep paying out for years, instead of a single click-through commission that pays once.</p>

<h2>Which model actually compounds</h2>
<p>One-time affiliate links and ad revenue both reset to zero every month — you have to keep producing new content just to maintain the same income. Recurring commission programs are the only model in this list where income from old content keeps compounding as your back catalog keeps referring new subscribers. For a closer look at how the main options stack up side by side, see our <a href="/best-affiliate-programs-for-coffee-creators">comparison of affiliate programs for coffee content creators</a>.</p>`,
  cbcHtml: `<p>If you create coffee content and want a monetization option that doesn't require constant new sponsorship deals, Coffee Brew Coach's <a href="/affiliate/become">recurring commission affiliate program</a> pays you monthly for every Pro subscriber you refer — not just once. It's built specifically for creators whose audience already asks coffee troubleshooting questions.</p>`,
  related: [
    { href: "/affiliate/become", label: "Become a Coffee Brew Coach affiliate" },
    { href: "/best-affiliate-programs-for-coffee-creators", label: "Best affiliate programs for coffee content creators" },
    { href: "/how-to-dial-in-espresso", label: "How to dial in espresso at home" },
    { href: "/coffee-grind-size-guide", label: "Coffee grind size guide" },
  ],
  ctaHeading: "Turn your coffee content into recurring income.",
  skipAffiliateCallout: true,
});

/* ─── 13. Best affiliate programs for coffee content creators ────────────── */

const bestAffiliateProgramsHtml = page({
  path: "/best-affiliate-programs-for-coffee-creators",
  title: "Best Affiliate Programs for Coffee Content Creators | Coffee Brew Coach",
  description:
    "A comparison of affiliate programs for coffee content creators — one-time gear commissions vs. recurring commission programs like Coffee Brew Coach's affiliate program.",
  h1: "Best affiliate programs for coffee content creators",
  lead:
    "Not all coffee affiliate programs pay the same way. Here's how the main options compare if you make coffee content and want to monetize your audience without selling anything you don't already recommend.",
  contentHtml: `
<h2>Gear affiliate programs (Amazon Associates and similar)</h2>
<p>The most common entry point for coffee creators. You link to a grinder, scale, or brewer, and earn a small one-time percentage — typically 1–4% — when someone buys through your link within a short cookie window (often just 24 hours). Good for driving some income from gear reviews, but it doesn't reward you for building a loyal, returning audience.</p>

<h2>Roaster and subscription-box affiliate programs</h2>
<p>Coffee bean subscription services sometimes offer a flat bounty (e.g. $10–20) for the first order a referred customer places. Some pay a small recurring cut for the customer's first few months, but almost none pay indefinitely for the life of the subscription.</p>

<h2>Recurring commission affiliate programs for coffee creators</h2>
<p>A smaller category, but the best fit if your content is about improving how people brew rather than what gear they buy. These programs pay a commission every month a referred subscriber remains active — meaning your existing content keeps earning long after you've published it.</p>
<p><a href="/affiliate/become">Coffee Brew Coach's affiliate program</a> is built this way: a recurring commission affiliate program specifically for coffee creators, with tiered rates that increase automatically as more of your referrals convert to paying subscribers (from $0.75/mo at the entry tier up to $2.00/mo once you've referred 1,000+ active subscribers). Affiliate payouts are currently open to creators based in the US and Canada.</p>

<h2>How to choose</h2>
<p>If your content already diagnoses brewing problems — "why is my espresso sour," "how to fix a bitter pour over" — a recurring commission affiliate program for coffee creators will out-earn a one-time gear link over any reasonable time horizon, because you're being paid for retention, not just a single click. Gear links still make sense as a complement for equipment-focused reviews, but shouldn't be your only affiliate income source.</p>`,
  cbcHtml: `<p>Coffee Brew Coach's <a href="/affiliate/become">become a coffee affiliate</a> page has the full tier breakdown, payout details, and a waitlist to join the program if you create coffee content and want recurring income instead of one-time gear commissions.</p>`,
  related: [
    { href: "/affiliate/become", label: "Coffee Brew Coach affiliate program details" },
    { href: "/how-coffee-youtubers-make-money", label: "How coffee YouTubers make money" },
    { href: "/why-does-my-coffee-taste-bitter", label: "Why does my coffee taste bitter?" },
  ],
  ctaHeading: "Join a recurring commission affiliate program built for coffee creators.",
  skipAffiliateCallout: true,
});

/* ─── Register all routes ─────────────────────────────────────────────────── */

const pages: Array<{ path: string; html: string }> = [
  { path: "/chemex", html: chemexHtml },
  { path: "/kalita-wave", html: kalitaHtml },
  { path: "/moka-pot", html: mokaPotHtml },
  { path: "/cold-brew", html: coldBrewHtml },
  { path: "/drip-machine", html: dripMachineHtml },
  { path: "/why-does-my-coffee-taste-bitter", html: bitterHtml },
  { path: "/espresso-pulling-too-fast", html: espressoFastHtml },
  { path: "/coffee-grind-size-guide", html: grindSizeHtml },
  { path: "/how-to-dial-in-espresso", html: dialInEspressoHtml },
  { path: "/aeropress-too-weak", html: aeropressWeakHtml },
  { path: "/french-press", html: frenchPressHtml },
  { path: "/how-coffee-youtubers-make-money", html: youtuberMoneyHtml },
  { path: "/best-affiliate-programs-for-coffee-creators", html: bestAffiliateProgramsHtml },
];

for (const { path, html } of pages) {
  router.get(path, (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    const sd = STRUCTURED_DATA[path];
    const finalHtml = sd
      ? html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(sd)}</script>\n</head>`)
      : html;
    res.send(finalHtml);
  });
}

export default router;
