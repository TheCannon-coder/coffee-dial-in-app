"""Generate the 1200x630 OG card PNG for /affiliate/become (social crawlers don't render SVG)."""
from PIL import Image, ImageDraw, ImageFont
import base64, os

W, H = 1200, 630
BG = "#2C1A0E"
ARC = "#3D2410"
CREAM = "#FAF7F2"
MUTED = "#A89080"
GOLD = "#D4B99A"

F = "/System/Library/Fonts/Supplemental"
def font(name, size):
    p = os.path.join(F, name)
    if not os.path.exists(p):
        raise SystemExit(f"missing font: {p}")
    return ImageFont.truetype(p, size)

S = 2
img = Image.new("RGB", (W * S, H * S), BG)
d = ImageDraw.Draw(img)

def ring(cx, cy, r, width):
    d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], outline=ARC, width=width * S)

ring(1100, -80, 380, 80)
ring(1100, -80, 280, 40)

d.text((80 * S, 80 * S), "Coffee Brew Coach — Affiliate Program", font=font("Georgia Italic.ttf", 26 * S), fill=MUTED)
big = font("Georgia Bold.ttf", 74 * S)
d.text((76 * S, 130 * S), "Paid every month", font=big, fill=CREAM)
d.text((76 * S, 216 * S), "your referrals stay.", font=big, fill=CREAM)

body = font("Arial.ttf", 27 * S)
d.text((80 * S, 330 * S), "Your audience gets a month of Pro free. You earn for as long as they subscribe.", font=body, fill=MUTED)

# Tier strip: monthly-plan rate · annual-plan rate
tiers = [("Standard", "$0.75/mo · $5 annual"), ("Silver", "$1.00/mo · $8 annual"), ("Gold", "$1.50/mo · $12 annual"), ("Platinum", "$2.00/mo · $15 annual")]
lbl = font("Arial Bold.ttf", 20 * S)
val = font("Arial.ttf", 20 * S)
x = 80
for name, rate in tiers:
    d.text((x * S, 400 * S), name, font=lbl, fill=GOLD)
    d.text((x * S, 430 * S), rate, font=val, fill=CREAM)
    x += 262

px, py, pw, ph = 80, 510, 300, 64
d.rounded_rectangle([px * S, py * S, (px + pw) * S, (py + ph) * S], radius=(ph // 2) * S, fill=CREAM)
label = "Join in the app · US & CA"
f = font("Arial Bold.ttf", 22 * S)
bbox = d.textbbox((0, 0), label, font=f)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((px + pw / 2) * S - tw / 2 - bbox[0], (py + ph / 2) * S - th / 2 - bbox[1]), label, font=f, fill=BG)

img = img.resize((W, H), Image.LANCZOS)
out = os.path.join(os.path.dirname(__file__), "affiliate-og.png")
img.save(out, "PNG", optimize=True)
size = os.path.getsize(out)
print(f"affiliate-og.png: {size} bytes ({size/1024:.1f} KB)")

b64 = base64.b64encode(open(out, "rb").read()).decode()
ts_path = os.path.join(os.path.dirname(__file__), "..", "artifacts", "api-server", "src", "lib", "affiliate-og-image.ts")
with open(ts_path, "w") as fh:
    fh.write(
        "// 1200x630 PNG social-share card for /affiliate/become. Generated from\n"
        "// scripts/make-affiliate-og.py; embedded as base64 so the esbuild bundle needs no asset pipeline.\n"
        f'export const AFFILIATE_OG_PNG: Buffer = Buffer.from(\n  "{b64}",\n  "base64",\n);\n'
    )
print(f"affiliate-og-image.ts: {os.path.getsize(ts_path)} bytes")
