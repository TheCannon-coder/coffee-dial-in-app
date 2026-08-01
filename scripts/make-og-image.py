"""Generate the 1200x630 OG card PNG for coffeebrew.coach in brand style."""
from PIL import Image, ImageDraw, ImageFont
import base64, os

W, H = 1200, 630
BG = "#2C1A0E"
ARC = "#3D2410"
CREAM = "#FAF7F2"
MUTED = "#A89080"

F = "/System/Library/Fonts/Supplemental"
def font(name, size):
    p = os.path.join(F, name)
    if not os.path.exists(p):
        raise SystemExit(f"missing font: {p}")
    return ImageFont.truetype(p, size)

georgia_italic = font("Georgia Italic.ttf", 30)
georgia_bold = font("Georgia Bold.ttf", 96)
arial = font("Arial.ttf", 30)
arial_bold = font("Arial Bold.ttf", 23)

# Supersample x2 for crisp arcs/text, then downscale.
S = 2
img = Image.new("RGB", (W * S, H * S), BG)
d = ImageDraw.Draw(img)

def ring(cx, cy, r, width):
    d.ellipse(
        [(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S],
        outline=ARC, width=width * S,
    )

ring(1100, -80, 380, 80)
ring(1100, -80, 280, 40)

d.text((80 * S, 88 * S), "Coffee Brew Coach", font=georgia_italic.font_variant(size=30 * S), fill=MUTED)
d.text((76 * S, 150 * S), "Brew better", font=georgia_bold.font_variant(size=96 * S), fill=CREAM)
d.text((76 * S, 262 * S), "coffee.", font=georgia_bold.font_variant(size=96 * S), fill=CREAM)
d.text((80 * S, 420 * S), "Describe how it tasted. Get one specific fix.", font=arial.font_variant(size=30 * S), fill=MUTED)

# CTA pill
px, py, pw, ph = 80, 500, 232, 64
d.rounded_rectangle([px * S, py * S, (px + pw) * S, (py + ph) * S], radius=(ph // 2) * S, fill=CREAM)
label = "Free for iOS"
f = arial_bold.font_variant(size=23 * S)
bbox = d.textbbox((0, 0), label, font=f)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((px + pw / 2) * S - tw / 2 - bbox[0], (py + ph / 2) * S - th / 2 - bbox[1]), label, font=f, fill=BG)

img = img.resize((W, H), Image.LANCZOS)
out = os.path.join(os.path.dirname(__file__), "og.png")
img.save(out, "PNG", optimize=True)

size = os.path.getsize(out)
print(f"og.png: {size} bytes ({size/1024:.1f} KB)")

b64 = base64.b64encode(open(out, "rb").read()).decode()
ts_path = os.path.join(os.path.dirname(__file__), "og-image.ts")
with open(ts_path, "w") as fh:
    fh.write(
        "// 1200x630 PNG social-share card (og:image). Generated from scripts/make-og-image.py;\n"
        "// embedded as base64 so the esbuild single-file bundle needs no asset pipeline.\n"
        f'export const OG_IMAGE_PNG: Buffer = Buffer.from(\n  "{b64}",\n  "base64",\n);\n'
    )
print(f"og-image.ts: {os.path.getsize(ts_path)} bytes")
