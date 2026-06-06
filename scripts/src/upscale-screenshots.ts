import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, "../../attached_assets/app-store-screenshots");

const FRAMES = [
  { src: "raw/frame1.jpg", out: "01-tell-us-how-it-tasted.png" },
  { src: "raw/frame2.jpg", out: "02-brew-it-right-every-step.png" },
  { src: "raw/frame3.jpg", out: "03-every-coffee-remembered.png" },
  { src: "raw/frame4.jpg", out: "04-one-expert-adjustment.png" },
  { src: "raw/frame5.jpg", out: "05-level-up-your-craft.png" },
];

// 6.5" iPhone slot accepted by App Store Connect (iPhone XS Max / 11 Pro Max / 12 Pro Max)
const TARGET_W = 1284;
const TARGET_H = 2778;

async function main() {
  console.log(`Upscaling to ${TARGET_W}×${TARGET_H}…\n`);
  await Promise.all(
    FRAMES.map(async ({ src, out }) => {
      await sharp(path.join(DIR, src))
        .resize(TARGET_W, TARGET_H, { kernel: sharp.kernel.lanczos3, fit: "fill" })
        .png({ compressionLevel: 9 })
        .toFile(path.join(DIR, out));
      console.log(`  ✓ ${out}`);
    })
  );
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
