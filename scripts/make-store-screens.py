#!/usr/bin/env python3
"""Render App Store screenshots: raw app captures -> framed, captioned images.

Usage:
  python3 scripts/make-store-screens.py

Reads raw captures from artifacts/dial-in/store/raw/<NN>-<name>.png (any
iPhone resolution). Missing raws render as labeled placeholders so the
design can be previewed before captures exist.

Outputs both required portrait sizes:
  artifacts/dial-in/store/screenshots/6.9/  (1320x2868)
  artifacts/dial-in/store/screenshots/6.5/  (1242x2688)
"""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "artifacts" / "dial-in" / "store"
RAW = ROOT / "raw"
OUT = ROOT / "screenshots"

CREAM = (245, 240, 232)
ESPRESSO = (44, 26, 14)
SOFT = (138, 122, 106)
CHIP_BG = (234, 226, 213)
BEZEL = (32, 20, 11)

SERIF = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SERIF_ITALIC = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
SANS = "/System/Library/Fonts/Helvetica.ttc"

# (raw filename, headline lines, subline, badge or None)
FRAMES = [
    ("01-tasting.png", ["Tell it how your", "coffee tasted"],
     "Tap what you taste — that's the whole job.", "★ 5.0 on the App Store"),
    ("02-advice.png", ["One clear call,", "every brew"],
     "A fix when you need one — or leave a great cup alone.", None),
    ("03-widget.png", ["Your plan waits on", "your home screen"],
     "Tomorrow's tweak, ready before you brew.", None),
    ("04-home.png", ["It learns your taste,", "brew by brew"],
     "Every coffee remembered — and what worked.", None),
    ("05-brewalong.png", ["Brew along,", "step by step"],
     "Free to start — 10 coached brews a month.", None),
]

SIZES = {"6.9": (1320, 2868), "6.5": (1242, 2688)}


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, *img.size], radius=radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def star_points(cx: float, cy: float, r: float) -> list[tuple[float, float]]:
    import math
    pts = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        radius = r if i % 2 == 0 else r * 0.42
        pts.append((cx + radius * math.cos(angle), cy - radius * math.sin(angle)))
    return pts


def draw_badge(d: ImageDraw.ImageDraw, W: int, y: int, badge: str,
               badge_f: ImageFont.FreeTypeFont) -> int:
    """Pill chip with a drawn star + text. Returns height consumed."""
    text = badge.removeprefix("★ ")
    star_r = int(W * 0.014)
    gap = int(W * 0.012)
    tw = d.textlength(text, font=badge_f)
    content_w = 2 * star_r + gap + tw
    pad_x, pad_y = int(W * 0.028), int(W * 0.014)
    line_h = int(W * 0.028)
    x0 = W / 2 - content_w / 2 - pad_x
    x1 = W / 2 + content_w / 2 + pad_x
    d.rounded_rectangle([x0, y, x1, y + line_h + 2 * pad_y],
                        radius=int(W * 0.03), fill=CHIP_BG)
    cy = y + pad_y + line_h / 2
    d.polygon(star_points(x0 + pad_x + star_r, cy, star_r), fill=(200, 154, 90))
    d.text((x0 + pad_x + 2 * star_r + gap, y + pad_y), text, font=badge_f, fill=ESPRESSO)
    return line_h + 2 * pad_y


def widget_composite(size: tuple[int, int] = (1179, 2556)) -> Image.Image:
    """Synthetic home-screen scene for the widget frame — no real user data.

    A muted wallpaper gradient, two generic neighbor widgets, and the Brew
    Plan widget rendered with sample data, drawn to match its real layout.
    """
    W, H = size
    img = Image.new("RGB", size)
    top, bottom = (58, 50, 44), (24, 20, 17)
    for yy in range(H):
        t = yy / H
        img.paste(tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)),
                  [0, yy, W, yy + 1])
    d = ImageDraw.Draw(img)

    margin = int(W * 0.055)
    gap = int(W * 0.04)
    small = (W - 2 * margin - gap) // 2
    y0 = int(H * 0.16)

    cal_f_day = font(SANS, int(W * 0.10))
    cal_f_label = font(SANS, int(W * 0.030))
    body_f = font(SANS, int(W * 0.034))

    # Generic calendar-ish widget
    cal = Image.new("RGB", (small, small), (250, 250, 250))
    cd = ImageDraw.Draw(cal)
    cd.text((int(small * 0.12), int(small * 0.10)), "MONDAY", font=cal_f_label, fill=(220, 80, 60))
    cd.text((int(small * 0.12), int(small * 0.17)), "14", font=cal_f_day, fill=(30, 30, 30))
    cd.text((int(small * 0.12), int(small * 0.62)), "No events today", font=body_f, fill=(140, 140, 140))
    cal = rounded(cal, int(small * 0.18))
    img.paste(cal, (margin, y0), cal)

    # Generic weather-ish widget
    wx = Image.new("RGB", (small, small), (72, 199, 142))
    wd = ImageDraw.Draw(wx)
    wd.text((int(small * 0.12), int(small * 0.10)), "Hamilton", font=body_f, fill=(255, 255, 255))
    wd.text((int(small * 0.12), int(small * 0.20)), "18°", font=cal_f_day, fill=(255, 255, 255))
    wd.text((int(small * 0.12), int(small * 0.66)), "Sunny", font=body_f, fill=(235, 250, 242))
    wd.text((int(small * 0.12), int(small * 0.76)), "H:22°  L:11°", font=body_f, fill=(235, 250, 242))
    wx = rounded(wx, int(small * 0.18))
    img.paste(wx, (margin + small + gap, y0), wx)

    # Brew Plan widget (medium), matching the real layout
    bp_w = W - 2 * margin
    bp_h = small
    bp = Image.new("RGB", (bp_w, bp_h), CREAM)
    bd = ImageDraw.Draw(bp)
    pad = int(bp_w * 0.055)
    label_f = font(SANS, int(bp_w * 0.032))
    coffee_f = font(SERIF, int(bp_w * 0.056))
    tweak_f = font(SANS, int(bp_w * 0.040))
    bd.text((pad, pad), "Today's plan", font=label_f, fill=SOFT)
    streak_txt = "6-day streak"
    stw = bd.textlength(streak_txt, font=label_f)
    star_r = int(bp_w * 0.014)
    bd.polygon(star_points(bp_w - pad - stw - star_r * 2 - 8 + star_r, pad + int(bp_w * 0.016), star_r),
               fill=(200, 154, 90))
    bd.text((bp_w - pad - stw, pad), streak_txt, font=label_f, fill=ESPRESSO)
    bd.text((pad, int(bp_h * 0.40)), "The Cannon Kenyan AB", font=coffee_f, fill=ESPRESSO)
    bd.text((pad, int(bp_h * 0.62)), "Grind a touch finer", font=tweak_f, fill=SOFT)
    bp = rounded(bp, int(small * 0.18))
    img.paste(bp, (margin, y0 + small + gap), bp)

    # A hint of another row fading out below
    hint = Image.new("RGB", (bp_w, small), (255, 255, 255))
    hint = rounded(hint, int(small * 0.18))
    hint.putalpha(26)
    img.paste(hint, (margin, y0 + 2 * (small + gap)), hint)

    return img


def placeholder(size: tuple[int, int], label: str) -> Image.Image:
    img = Image.new("RGB", size, (225, 217, 205))
    d = ImageDraw.Draw(img)
    f = font(SERIF_ITALIC, size[0] // 16)
    text = f"{label}\n(real capture goes here)"
    d.multiline_text((size[0] / 2, size[1] / 2), text, font=f, fill=SOFT,
                     anchor="mm", align="center", spacing=20)
    return img


def render(frame_idx: int, raw_name: str, headline: list[str], subline: str,
           badge: str | None, canvas_size: tuple[int, int]) -> Image.Image:
    W, H = canvas_size
    canvas = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(canvas)

    wordmark_f = font(SERIF_ITALIC, int(W * 0.030))
    head_f = font(SERIF, int(W * 0.072))
    sub_f = font(SANS, int(W * 0.032))
    badge_f = font(SANS, int(W * 0.028))

    y = int(H * 0.045)
    y += int(W * 0.030) + int(H * 0.022)
    y += len(headline) * int(W * 0.072 * 1.18)
    y += int(H * 0.008)
    y += int(W * 0.032) + int(H * 0.014)
    if badge:
        y += int(W * 0.028) + 2 * int(W * 0.014) + int(H * 0.012)

    # Device frame fills the rest, bleeding off the bottom edge slightly.
    frame_top = max(y + int(H * 0.015), int(H * 0.26))
    shot_w = int(W * 0.80)
    bezel = int(W * 0.011)
    corner = int(W * 0.115)

    raw_path = RAW / raw_name
    shot_h_target = int(H - frame_top + int(H * 0.03))  # bleed past bottom
    inner_w = shot_w - 2 * bezel
    if raw_path.exists():
        shot = Image.open(raw_path).convert("RGB")
    elif raw_name == "03-widget.png":
        # Privacy by design: the widget frame is always a synthetic scene
        # unless a deliberately staged capture is provided.
        shot = widget_composite()
    else:
        shot = placeholder((1179, 2556), raw_name.split("-")[1].split(".")[0].title())
    ratio = inner_w / shot.width
    shot = shot.resize((inner_w, int(shot.height * ratio)), Image.LANCZOS)

    frame_h = min(shot.height + 2 * bezel, shot_h_target)
    frame_x = (W - shot_w) // 2

    # Soft shadow behind the device
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [frame_x + 8, frame_top + 18, frame_x + shot_w + 8, frame_top + frame_h + 18],
        radius=corner, fill=(44, 26, 14, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    canvas.paste(Image.new("RGB", (W, H), CREAM), (0, 0))
    canvas.paste(shadow, (0, 0), shadow)
    # Re-draw text over the shadow-cleared canvas
    d = ImageDraw.Draw(canvas)
    y2 = int(H * 0.045)
    d.text((W / 2, y2), "Coffee Brew Coach", font=wordmark_f, fill=SOFT, anchor="ma")
    y2 += int(W * 0.030) + int(H * 0.022)
    for line in headline:
        d.text((W / 2, y2), line, font=head_f, fill=ESPRESSO, anchor="ma")
        y2 += int(W * 0.072 * 1.18)
    y2 += int(H * 0.008)
    d.text((W / 2, y2), subline, font=sub_f, fill=SOFT, anchor="ma")
    y2 += int(W * 0.032) + int(H * 0.014)
    if badge:
        draw_badge(d, W, y2, badge, badge_f)

    # Bezel + screenshot, clipped to the canvas
    device = Image.new("RGB", (shot_w, frame_h), BEZEL)
    device.paste(shot, (bezel, bezel))
    device = rounded(device, corner)
    canvas.paste(device, (frame_x, frame_top), device)

    return canvas


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for label, size in SIZES.items():
        out_dir = OUT / label
        out_dir.mkdir(parents=True, exist_ok=True)
        for i, (raw_name, headline, subline, badge) in enumerate(FRAMES, 1):
            img = render(i, raw_name, headline, subline, badge, size)
            path = out_dir / f"{i:02d}.png"
            img.save(path, "PNG")
            print(f"wrote {path} ({size[0]}x{size[1]})")


if __name__ == "__main__":
    main()
