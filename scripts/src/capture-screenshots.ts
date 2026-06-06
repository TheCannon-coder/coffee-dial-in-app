import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(
  __dirname,
  "../../attached_assets/app-store-screenshots"
);
const FONT_DIR = "/tmp/fonts";

mkdirSync(OUT_DIR, { recursive: true });

function b64(file: string): string {
  return readFileSync(path.join(FONT_DIR, file)).toString("base64");
}

function fontFaces(): string {
  return `
    @font-face {
      font-family: 'Fraunces';
      font-style: normal;
      font-weight: 300;
      src: url('data:font/truetype;base64,${b64("fraunces-300.ttf")}') format('truetype');
    }
    @font-face {
      font-family: 'Fraunces';
      font-style: italic;
      font-weight: 300;
      src: url('data:font/truetype;base64,${b64("fraunces-300i.ttf")}') format('truetype');
    }
    @font-face {
      font-family: 'Fraunces';
      font-style: normal;
      font-weight: 500;
      src: url('data:font/truetype;base64,${b64("fraunces-500.ttf")}') format('truetype');
    }
    @font-face {
      font-family: 'DM Sans';
      font-style: normal;
      font-weight: 400;
      src: url('data:font/truetype;base64,${b64("dmsans-400.ttf")}') format('truetype');
    }
    @font-face {
      font-family: 'DM Sans';
      font-style: normal;
      font-weight: 500;
      src: url('data:font/truetype;base64,${b64("dmsans-500.ttf")}') format('truetype');
    }
    @font-face {
      font-family: 'DM Sans';
      font-style: normal;
      font-weight: 600;
      src: url('data:font/truetype;base64,${b64("dmsans-600.ttf")}') format('truetype');
    }
  `;
}

function svg(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>${fontFaces()}</style>
  </defs>
  ${body}
</svg>`;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function rect(x: number, y: number, w: number, h: number, fill: string, r = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${r}" ry="${r}"/>`;
}
function text(
  x: number, y: number, content: string,
  { fill = "#FAF7F2", size = 14, family = "DM Sans", weight = 400, italic = false, anchor = "middle" as "start"|"middle"|"end" } = {}
) {
  const style = italic ? "italic" : "normal";
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-family="${family}" font-weight="${weight}" font-style="${style}" text-anchor="${anchor}" dominant-baseline="auto">${content}</text>`;
}
function pill(cx: number, cy: number, label: string, bg: string, textColor = "#FAF7F2", w = 120, h = 44) {
  return `${rect(cx - w/2, cy - h/2, w, h, bg, h/2)}
  <text x="${cx}" y="${cy + 1}" fill="${textColor}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
}

// ── FRAME 1: Tell us how it tasted ───────────────────────────────────────────
function frame1(): string {
  const W = 430, H = 932;
  const BG = "#2C1A0E", CARD = "#3D2410", LABEL = "#A89080", FG = "#FAF7F2";
  const HIGHLIGHT = "#5C3A1E";

  const tags = [
    ["Too bitter", HIGHLIGHT], ["Flat / thin", HIGHLIGHT], ["Too sour", CARD],
    ["Weak", CARD],            ["Harsh", HIGHLIGHT],       ["Too strong", CARD],
    ["Salty", CARD],           ["Muddy", HIGHLIGHT],
  ];

  const TAG_H = 40, TAG_PAD = 10;
  let tagRows = "";
  const cols = 3;
  const tagWidths = [112, 110, 100, 72, 84, 106, 68, 84];
  let rowX = 0, rowY = 0;
  tags.forEach(([label, bg], i) => {
    const tw = tagWidths[i];
    if (rowX + tw + TAG_PAD > 350 && rowX > 0) { rowX = 0; rowY += TAG_H + 10; }
    tagRows += `${rect(28 + 20 + rowX, 490 + rowY, tw, TAG_H, bg, TAG_H/2)}
    <text x="${28 + 20 + rowX + tw/2}" y="${490 + rowY + TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
    rowX += tw + TAG_PAD;
  });

  return svg(W, H, `
    ${rect(0, 0, W, H, BG)}

    <!-- header -->
    ${text(W/2, 100, "Coffee Brew Coach", { fill: LABEL, size: 17, family: "Fraunces", weight: 300, italic: true })}
    ${text(W/2, 155, "Tell us how", { fill: FG, size: 42, family: "Fraunces", weight: 500 })}
    ${text(W/2, 203, "it tasted.", { fill: FG, size: 42, family: "Fraunces", weight: 500 })}
    ${text(W/2, 240, "Get one clear fix. Every time.", { fill: LABEL, size: 17 })}

    <!-- card -->
    ${rect(28, 310, W - 56, 570, CARD, 24)}

    <!-- HOW DID IT TASTE? -->
    <text x="48" y="352" fill="${LABEL}" font-size="13" font-family="DM Sans" font-weight="500" text-anchor="start" dominant-baseline="auto" letter-spacing="1">HOW DID IT TASTE?</text>

    <!-- tags row 1: Too bitter, Flat / thin, Too sour -->
    ${rect(48, 370, 112, TAG_H, HIGHLIGHT, TAG_H/2)}
    <text x="${48+56}" y="${370+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Too bitter</text>

    ${rect(170, 370, 106, TAG_H, HIGHLIGHT, TAG_H/2)}
    <text x="${170+53}" y="${370+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Flat / thin</text>

    ${rect(286, 370, 96, TAG_H, CARD, TAG_H/2)}
    <text x="${286+48}" y="${370+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Too sour</text>

    <!-- tags row 2: Weak, Harsh, Too strong -->
    ${rect(48, 422, 72, TAG_H, CARD, TAG_H/2)}
    <text x="${48+36}" y="${422+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Weak</text>

    ${rect(130, 422, 80, TAG_H, HIGHLIGHT, TAG_H/2)}
    <text x="${130+40}" y="${422+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Harsh</text>

    ${rect(220, 422, 110, TAG_H, CARD, TAG_H/2)}
    <text x="${220+55}" y="${422+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Too strong</text>

    <!-- tags row 3: Salty, Muddy -->
    ${rect(48, 474, 70, TAG_H, CARD, TAG_H/2)}
    <text x="${48+35}" y="${474+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Salty</text>

    ${rect(128, 474, 80, TAG_H, HIGHLIGHT, TAG_H/2)}
    <text x="${128+40}" y="${474+TAG_H/2}" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">Muddy</text>

    <!-- divider -->
    ${rect(48, 526, 334, 1, "rgba(255,255,255,0.08)")}

    <!-- note label & input -->
    <text x="48" y="552" fill="${LABEL}" font-size="14" font-family="DM Sans" text-anchor="start">Any other notes?</text>
    ${rect(48, 566, 334, 48, BG, 12)}
    <text x="64" y="595" fill="#6B5040" font-size="14" font-family="DM Sans" text-anchor="start">e.g. looked really dark, smelled smoky…</text>

    <!-- CTA button -->
    ${rect(48, 634, 334, 56, FG, 28)}
    <text x="${W/2}" y="668" fill="${BG}" font-size="17" font-family="DM Sans" font-weight="600" text-anchor="middle" dominant-baseline="middle">Analyse my brew →</text>

    <!-- footer -->
    <text x="${W/2}" y="880" fill="#6B5040" font-size="14" font-family="DM Sans" text-anchor="middle">No barista knowledge needed</text>
  `);
}

// ── FRAME 2: Brew it right, every step ───────────────────────────────────────
function frame2(): string {
  const W = 430, H = 932;
  const BG = "#1A100A", LABEL = "#A89080", FG = "#FAF7F2", BODY = "#D4C4B4";

  const totalSteps = 6;
  const segW = Math.floor((W - 56) / totalSteps) - 4;

  let steps = "";
  for (let i = 0; i < totalSteps; i++) {
    const x = 28 + i * (segW + 4);
    const fill = i < 3 ? FG : i === 3 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)";
    steps += rect(x, 200, segW, 4, fill, 2);
  }

  return svg(W, H, `
    ${rect(0, 0, W, H, BG)}

    <!-- header -->
    <text x="28" y="88" fill="${LABEL}" font-size="17" font-family="Fraunces" font-weight="300" font-style="italic" text-anchor="start">Coffee Brew Coach</text>
    <text x="28" y="143" fill="${FG}" font-size="42" font-family="Fraunces" font-weight="500" text-anchor="start">Brew it right,</text>
    <text x="28" y="192" fill="${FG}" font-size="42" font-family="Fraunces" font-weight="500" text-anchor="start">every step.</text>
    <text x="28" y="230" fill="${LABEL}" font-size="17" font-family="DM Sans" text-anchor="start">Timed guides for every method.</text>

    <!-- step progress bars -->
    ${steps}

    <!-- step meta -->
    <text x="28" y="248" fill="${LABEL}" font-size="12" font-family="DM Sans" font-weight="500" text-anchor="start" letter-spacing="1">STEP 4 OF 6  ·  V60</text>

    <!-- step title -->
    <text x="28" y="300" fill="${FG}" font-size="36" font-family="Fraunces" font-weight="500" text-anchor="start">First pour</text>

    <!-- step description -->
    <text x="28" y="342" fill="${BODY}" font-size="18" font-family="DM Sans" text-anchor="start">Continue pouring in slow circles to</text>
    <text x="28" y="370" fill="${BODY}" font-size="18" font-family="DM Sans" text-anchor="start">150ml total. Keep it gentle and steady.</text>

    <!-- timer -->
    <text x="28" y="480" fill="${FG}" font-size="80" font-family="Fraunces" font-weight="300" text-anchor="start" letter-spacing="2">0:31</text>

    <!-- progress bar track -->
    ${rect(28, 510, W - 56, 4, "rgba(255,255,255,0.1)", 2)}
    <!-- progress fill (31%) -->
    ${rect(28, 510, Math.round((W - 56) * 0.31), 4, FG, 2)}

    <!-- CTA button -->
    ${rect(28, 848, W - 56, 56, FG, 28)}
    <text x="${W/2}" y="882" fill="#2C1A0E" font-size="17" font-family="DM Sans" font-weight="600" text-anchor="middle" dominant-baseline="middle">Wait for timer…</text>
  `);
}

// ── FRAME 3: Every coffee, remembered ────────────────────────────────────────
function frame3(): string {
  const W = 430, H = 932;
  const BG = "#FAF7F2", CARD_BG = "#FFFFFF", BORDER = "#E8DDD4";
  const DARK = "#2C1A0E", MUTED = "#8B6347", SUPER_MUTED = "#A89080";
  const TAG_BG = "#F0E8DF";

  const coffees = [
    { name: "Ethiopian Yirgacheffe", count: 6, method: "V60",         adj: "→ Grind finer",   date: "Today",  showCount: true },
    { name: "Colombian Huila",        count: 4, method: "AeroPress",   adj: "→ Leave as-is ✓", date: "Jun 4",  showCount: true },
    { name: "Kenya AA Washed",        count: 2, method: "French press",adj: "→ Steep longer",  date: "Jun 2",  showCount: true },
    { name: "Brazil Cerrado",         count: 1, method: "Espresso",    adj: "→ Grind coarser", date: "May 30", showCount: false },
  ];

  const CARD_H = 90;
  const CARD_GAP = 12;
  const CARD_X = 24;
  const CARD_W = W - 48;
  const startY = 220;

  let cards = "";
  coffees.forEach((c, i) => {
    const cy = startY + i * (CARD_H + CARD_GAP);
    cards += `
      ${rect(CARD_X, cy, CARD_W, CARD_H, CARD_BG, 16)}
      <rect x="${CARD_X}" y="${cy}" width="${CARD_W}" height="${CARD_H}" fill="none" stroke="${BORDER}" stroke-width="1" rx="16" ry="16"/>
      <text x="${CARD_X + 18}" y="${cy + 32}" fill="${DARK}" font-size="17" font-family="Fraunces" font-weight="500" text-anchor="start">${c.name}</text>
      ${c.showCount ? `${rect(CARD_X + 18 + c.name.length * 9.5, cy + 16, 36, 24, TAG_BG, 12)}
      <text x="${CARD_X + 18 + c.name.length * 9.5 + 18}" y="${cy + 29}" fill="${DARK}" font-size="12" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">${c.count}</text>` : ""}
      <text x="${CARD_X + CARD_W - 18}" y="${cy + 32}" fill="${SUPER_MUTED}" font-size="13" font-family="DM Sans" text-anchor="end">${c.date}</text>
      <text x="${CARD_X + 18}" y="${cy + 62}" fill="${MUTED}" font-size="13" font-family="DM Sans" text-anchor="start">${c.method}</text>
      ${rect(CARD_X + 18 + c.method.length * 7.5 + 10, cy + 48, c.adj.length * 7.5 + 16, 24, TAG_BG, 12)}
      <text x="${CARD_X + 18 + c.method.length * 7.5 + 10 + (c.adj.length * 7.5 + 16)/2}" y="${cy + 61}" fill="${DARK}" font-size="13" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">${c.adj}</text>
    `;
  });

  return svg(W, H, `
    ${rect(0, 0, W, H, BG)}

    <text x="24" y="88" fill="${MUTED}" font-size="17" font-family="Fraunces" font-weight="300" font-style="italic" text-anchor="start">Coffee Brew Coach</text>
    <text x="24" y="140" fill="${DARK}" font-size="40" font-family="Fraunces" font-weight="500" text-anchor="start">Every coffee,</text>
    <text x="24" y="188" fill="${DARK}" font-size="40" font-family="Fraunces" font-weight="500" text-anchor="start">remembered.</text>
    <text x="24" y="218" fill="${MUTED}" font-size="17" font-family="DM Sans" text-anchor="start">Grouped by bean. Sorted by taste.</text>

    ${cards}
  `);
}

// ── FRAME 4: One expert adjustment ───────────────────────────────────────────
function frame4(): string {
  const W = 430, H = 932;
  const BG = "#2C1A0E", CARD = "#3D2410", LABEL = "#A89080", FG = "#FAF7F2";

  const advice = "Your grind is too coarse for this Ethiopian — you're under-extracting, which is giving you that flat, sour edge. Try one step finer and keep everything else the same.";

  const wrapText = (txt: string, maxW: number, size: number): string[] => {
    const words = txt.split(" ");
    const lines: string[] = [];
    let line = "";
    const charW = size * 0.52;
    const maxChars = Math.floor(maxW / charW);
    words.forEach((w) => {
      if ((line + w).length > maxChars) { lines.push(line.trim()); line = w + " "; }
      else line += w + " ";
    });
    if (line.trim()) lines.push(line.trim());
    return lines;
  };

  const adviceLines = wrapText(advice, 350, 22);
  let adviceSvg = "";
  adviceLines.forEach((l, i) => {
    adviceSvg += `<text x="48" y="${380 + i * 30}" fill="${FG}" font-size="22" font-family="Fraunces" font-weight="500" text-anchor="start">${l}</text>`;
  });

  const statsY = 630;
  const statW = (W - 56 - 24) / 3;

  return svg(W, H, `
    ${rect(0, 0, W, H, BG)}

    <text x="${W/2}" y="100" fill="${LABEL}" font-size="17" font-family="Fraunces" font-weight="300" font-style="italic" text-anchor="middle">Coffee Brew Coach</text>
    <text x="${W/2}" y="155" fill="${FG}" font-size="42" font-family="Fraunces" font-weight="500" text-anchor="middle">One expert</text>
    <text x="${W/2}" y="205" fill="${FG}" font-size="42" font-family="Fraunces" font-weight="500" text-anchor="middle">adjustment.</text>
    <text x="${W/2}" y="242" fill="${LABEL}" font-size="17" font-family="DM Sans" text-anchor="middle">Based on how your cup tasted.</text>

    <!-- coaching card -->
    ${rect(28, 268, W - 56, 340, CARD, 24)}
    <text x="48" y="302" fill="${LABEL}" font-size="12" font-family="DM Sans" font-weight="500" text-anchor="start" letter-spacing="1">YOUR COACHING</text>

    ${adviceSvg}

    <!-- action pill -->
    ${rect(48, 548, 188, 40, BG, 20)}
    <text x="142" y="568" fill="${FG}" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="middle" dominant-baseline="middle">→ Grind one step finer</text>

    <!-- stat cards -->
    ${rect(28, statsY, statW, 70, CARD, 16)}
    <text x="${28 + statW/2}" y="${statsY + 30}" fill="${FG}" font-size="28" font-family="Fraunces" text-anchor="middle" dominant-baseline="middle">V60</text>
    <text x="${28 + statW/2}" y="${statsY + 56}" fill="${LABEL}" font-size="12" font-family="DM Sans" text-anchor="middle">Method</text>

    ${rect(28 + statW + 12, statsY, statW, 70, CARD, 16)}
    <text x="${28 + statW + 12 + statW/2}" y="${statsY + 30}" fill="${FG}" font-size="28" font-family="Fraunces" text-anchor="middle" dominant-baseline="middle">15g</text>
    <text x="${28 + statW + 12 + statW/2}" y="${statsY + 56}" fill="${LABEL}" font-size="12" font-family="DM Sans" text-anchor="middle">Dose</text>

    ${rect(28 + (statW + 12) * 2, statsY, statW, 70, CARD, 16)}
    <text x="${28 + (statW + 12) * 2 + statW/2}" y="${statsY + 30}" fill="${FG}" font-size="28" font-family="Fraunces" text-anchor="middle" dominant-baseline="middle">2:45</text>
    <text x="${28 + (statW + 12) * 2 + statW/2}" y="${statsY + 56}" fill="${LABEL}" font-size="12" font-family="DM Sans" text-anchor="middle">Time</text>

    <!-- CTA button -->
    ${rect(28, 848, W - 56, 56, FG, 28)}
    <text x="${W/2}" y="882" fill="${BG}" font-size="17" font-family="DM Sans" font-weight="600" text-anchor="middle" dominant-baseline="middle">Save &amp; brew again →</text>
  `);
}

// ── FRAME 5: Level up your craft ─────────────────────────────────────────────
function frame5(): string {
  const W = 430, H = 932;
  const BG = "#FAF7F2", DARK = "#2C1A0E", MUTED = "#8B6347", SUPER_MUTED = "#A89080";
  const EARNED_BG = "#FFFFFF", LOCKED_BG = "#F0E8DF", BORDER = "#E8DDD4";

  const badges = [
    { emoji: "🌱", label: "First Sip",       earned: true },
    { emoji: "☕", label: "Getting Dialed",  earned: true },
    { emoji: "🏠", label: "Home Barista",    earned: true },
    { emoji: "🎯", label: "Perfectionist",   earned: true },
    { emoji: "🗺️", label: "Method Explorer", earned: true },
    { emoji: "📐", label: "Consistent Cup",  earned: true },
    { emoji: "🤓", label: "Coffee Nerd",     earned: false },
    { emoji: "🌍", label: "Method Master",   earned: false },
    { emoji: "🏆", label: "Master Brewer",   earned: false },
  ];

  const COLS = 3;
  const CELL_W = Math.floor((W - 48 - (COLS - 1) * 12) / COLS);
  const CELL_H = 90;
  const GRID_X = 24;
  const GRID_Y = 230;

  let grid = "";
  badges.forEach((b, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = GRID_X + col * (CELL_W + 12);
    const cy = GRID_Y + row * (CELL_H + 12);
    const opacity = b.earned ? 1 : 0.45;
    const fill = b.earned ? EARNED_BG : LOCKED_BG;
    const stroke = b.earned ? BORDER : "transparent";
    grid += `
      <g opacity="${opacity}">
        ${rect(cx, cy, CELL_W, CELL_H, fill, 14)}
        <rect x="${cx}" y="${cy}" width="${CELL_W}" height="${CELL_H}" fill="none" stroke="${stroke}" stroke-width="1" rx="14"/>
        <text x="${cx + CELL_W/2}" y="${cy + 36}" font-size="26" text-anchor="middle" dominant-baseline="middle">${b.emoji}</text>
        <text x="${cx + CELL_W/2}" y="${cy + 72}" fill="${DARK}" font-size="11" font-family="DM Sans" font-weight="500" text-anchor="middle">${b.label}</text>
      </g>
    `;
  });

  const streakY = 584;

  return svg(W, H, `
    ${rect(0, 0, W, H, BG)}

    <text x="24" y="88" fill="${MUTED}" font-size="17" font-family="Fraunces" font-weight="300" font-style="italic" text-anchor="start">Coffee Brew Coach</text>
    <text x="24" y="138" fill="${DARK}" font-size="40" font-family="Fraunces" font-weight="500" text-anchor="start">Level up</text>
    <text x="24" y="184" fill="${DARK}" font-size="40" font-family="Fraunces" font-weight="500" text-anchor="start">your craft.</text>
    <text x="24" y="214" fill="${MUTED}" font-size="17" font-family="DM Sans" text-anchor="start">Earn badges as you improve.</text>

    ${grid}

    <!-- streak card -->
    ${rect(24, streakY, W - 48, 116, DARK, 20)}
    <text x="44" y="${streakY + 32}" fill="#FAF7F2" font-size="15" font-family="DM Sans" font-weight="500" text-anchor="start">Brewing streak</text>
    <text x="${W - 44}" y="${streakY + 32}" fill="#FAF7F2" font-size="22" font-family="Fraunces" text-anchor="end">23 brews</text>

    <!-- progress bar -->
    ${rect(44, streakY + 48, W - 96, 6, "rgba(255,255,255,0.12)", 3)}
    ${rect(44, streakY + 48, Math.round((W - 96) * 0.23), 6, "#FAF7F2", 3)}

    <text x="44" y="${streakY + 80}" fill="${SUPER_MUTED}" font-size="12" font-family="DM Sans" text-anchor="start">2 more brews to unlock Coffee Nerd</text>
  `);
}

// ── render ────────────────────────────────────────────────────────────────────
const frames: Array<{ name: string; svgFn: () => string }> = [
  { name: "01-tell-us-how-it-tasted",    svgFn: frame1 },
  { name: "02-brew-it-right-every-step", svgFn: frame2 },
  { name: "03-every-coffee-remembered",  svgFn: frame3 },
  { name: "04-one-expert-adjustment",    svgFn: frame4 },
  { name: "05-level-up-your-craft",      svgFn: frame5 },
];

const TARGET_W = 1290;
const TARGET_H = 2796;

async function main() {
  console.log(`Rendering ${frames.length} screenshots at ${TARGET_W}×${TARGET_H}…\n`);

  await Promise.all(
    frames.map(async ({ name, svgFn }) => {
      const svgStr = svgFn();
      const outPath = path.join(OUT_DIR, `${name}.png`);

      await sharp(Buffer.from(svgStr))
        .resize(TARGET_W, TARGET_H)
        .png()
        .toFile(outPath);

      console.log(`  ✓ ${name}.png`);
    })
  );

  console.log(`\nDone — files in ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
