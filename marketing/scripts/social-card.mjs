#!/usr/bin/env node
// Renders a 1080×1080 brand-styled SVG card for Instagram. No dependencies.
//
//   node marketing/scripts/social-card.mjs --out path.svg --eyebrow "MOKA POT" \
//     --title "Bitter? Pull it off the heat at the first sputter." \
//     --body "The gurgle is the coffee telling you it's done." [--light]
//
// Rasterise on a Mac with:  qlmanage -t -s 1080 -o <dir> path.svg

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "true" : arr[i + 1]]);
    return acc;
  }, []),
);
const out = args.out;
if (!out) {
  console.error("--out is required");
  process.exit(1);
}
const light = args.light === "true";
const BG = light ? "#FAF7F2" : "#2C1A0E";
const FG = light ? "#2C1A0E" : "#FAF7F2";
const MUTED = light ? "#8B6347" : "#A89080";
const ACCENT = "#C07A30";
const ARC = light ? "#F0EBE3" : "#3D2410";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Greedy wrap by estimated glyph width (serif ~0.52em, sans ~0.5em average).
function wrap(text, size, maxWidth, em = 0.52) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length * size * em > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

const W = 1080, PAD = 96, MAXW = W - PAD * 2;
const titleSize = (args.title ?? "").length > 60 ? 64 : 76;
const titleLines = wrap(args.title ?? "", titleSize, MAXW, 0.5);
const bodyLines = wrap(args.body ?? "", 38, MAXW, 0.5);

let y = 200;
const eyebrow = args.eyebrow
  ? `<text x="${PAD}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="4" fill="${ACCENT}">${esc(String(args.eyebrow).toUpperCase())}</text>`
  : "";
y += args.eyebrow ? 70 : 0;
const title = titleLines
  .map((l, i) => `<text x="${PAD}" y="${y + i * titleSize * 1.12}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700" fill="${FG}">${esc(l)}</text>`)
  .join("\n");
y += titleLines.length * titleSize * 1.12 + 40;
const body = bodyLines
  .map((l, i) => `<text x="${PAD}" y="${y + i * 38 * 1.5}" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="${MUTED}">${esc(l)}</text>`)
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <rect width="${W}" height="${W}" fill="${BG}"/>
  <circle cx="1010" cy="-40" r="300" fill="none" stroke="${ARC}" stroke-width="70"/>
  <circle cx="1010" cy="-40" r="210" fill="none" stroke="${ARC}" stroke-width="34"/>
  <text x="${PAD}" y="${W - 110}" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="30" fill="${MUTED}">Coffee Brew Coach</text>
  <text x="${W - PAD}" y="${W - 110}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${MUTED}">coffeebrew.coach</text>
  ${eyebrow}
  ${title}
  ${body}
</svg>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`${out}: ${titleLines.length} title line(s), ${bodyLines.length} body line(s)`);
