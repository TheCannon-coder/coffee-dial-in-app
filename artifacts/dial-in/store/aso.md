# App Store page optimization — Coffee Brew Coach

Why: the product page converts at 1.00% vs. a 1.38% Food & Drink freemium median
(ASC Benchmarks, Aug 2026), and App Store Search delivers ~1 view/day. Everything
below is metadata Chris pastes into App Store Connect. Subtitle, keywords, and
screenshots only update with a version release — bundle them with the next
submission. Promotional text can be changed any time, no review needed.

## Subtitle (30 chars max — shows under the name in search)

> **Dial in espresso & pour over** (28)

Alternate: "Better coffee, one tweak a day" (30)

## Keyword field (100 chars max, comma-separated, no spaces after commas)

> `v60,aeropress,chemex,french press,moka,grind size,bitter,sour,barista,recipe,timer,latte` (88)

Notes: never repeat words from the name ("coffee brew coach") or subtitle
("dial", "espresso", "pour over") — Apple indexes those for free; repeats waste
characters. "bitter"/"sour" catch problem-searches ("coffee tastes bitter").

## Promotional text (170 chars max — editable anytime, shows atop description)

> Tell us how your cup tasted and get one clear adjustment for tomorrow's brew.
> No jargon, no guesswork — just better coffee, one tweak at a time. (143)

## Description (lead with the loop; first 3 lines show before "more")

Your coffee can get better every single day — you just need to know which one
thing to change.

Coffee Brew Coach is like having a barista friend on call. After each brew,
tell us how the cup tasted. We give you one clear adjustment to try next time —
grind a touch finer, pull back the temperature, let it bloom a little longer.
Brew, taste, tweak, repeat. That's how baristas dial in coffee, and now it's
how you will too.

**How it works**
- Log your brew in seconds — method, dose, and how it tasted
- Get one specific adjustment, in plain words, not jargon
- Tell us if the next cup was better — the coaching learns your taste
- Watch your streak grow as the tweaks add up

**Works with your setup**
V60, Chemex, AeroPress, French press, espresso, drip machine — whatever you
brew with, at any skill level. No fancy gear required.

**Free to use**
10 coached brews every month, free. Pro unlocks unlimited brews and your full
brew history.

Your perfect brew could be today. Let's find out.

## Screenshot plan (biggest conversion lever — needs new art)

Required size: 1320×2868 (6.9") — Apple scales the rest. 5 frames, each =
device screenshot + short headline above it on the cream (#F5F0E8) background:

1. Tasting screen — **"Tell us how it tasted"**
2. Advice screen — **"Get one clear adjustment"**
3. "Was it better?" card — **"It learns your taste, brew by brew"**
4. Streak + weekly recap — **"Watch your coffee get better"**
5. Method picker — **"V60 to espresso — any setup"**

Process: Chris captures raw screenshots on-device (Settings → nice sample data
first), then a Pillow script (like scripts/make-og-image.py) frames them with
headlines. Then run an App Store Connect Product Page Optimization A/B test
against the current set.

## In-app (shipped in code, this repo)

- Native rating prompt fires after a user answers "was it better?" with YES
  (lib/review.ts — 90-day cooldown, iOS caps at 3/year on its own).
- "Rate Coffee Brew Coach" row in Settings → About (always available).
- Referral share text now leads with the code + "month of Pro free" so
  attribution survives the App Store install gap.
