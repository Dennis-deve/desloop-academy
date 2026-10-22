#!/usr/bin/env python3
"""Create local web assets from the five user-supplied Desloop brand JPEGs.

Requires Pillow (`python3 -m pip install Pillow`). Original images are preserved in
assets/brand-originals. This script only crops/resizes/compresses; it does not redraw
or claim ownership of the provided identity. Run from any working directory.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'brand-originals'
DEST = ROOT / 'public' / 'brand'
DEST.mkdir(parents=True, exist_ok=True)

SPECS = (
    ('dl-academy.jpg', 'wordmark-dark.webp', (390, 310, 2360, 1220), 1200),
    ('dl-white background.jpg', 'wordmark-light.webp', (380, 295, 2380, 1200), 1200),
    ('monochrome-version.jpg', 'wordmark-mono.webp', (470, 305, 2290, 1220), 900),
    ('standalone-brandmark.jpg', 'brandmark-dark.webp', (645, 365, 2110, 1220), 720),
)

for source, target, box, width in SPECS:
    with Image.open(SOURCE / source) as original:
        cropped = original.convert('RGB').crop(box)
        height = round(cropped.height * width / cropped.width)
        cropped.resize((width, height), Image.Resampling.LANCZOS).save(
            DEST / target, 'WEBP', quality=86, method=6
        )

with Image.open(SOURCE / 'desloop-mobile-app-icon.jpg') as original:
    icon = ImageOps.fit(original.convert('RGB'), (560, 560), method=Image.Resampling.LANCZOS)
    icon.save(DEST / 'app-icon.webp', 'WEBP', quality=86, method=6)
    icon.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / 'public' / 'apple-touch-icon.png', optimize=True)

# A tiny brand favicon uses the supplied infinity brandmark, not the old invented SVG.
with Image.open(DEST / 'brandmark-dark.webp') as source:
    square = Image.new('RGB', (96, 96), '#0a142b')
    mark = source.convert('RGB')
    mark.thumbnail((91, 68), Image.Resampling.LANCZOS)
    square.paste(mark, ((96 - mark.width) // 2, (96 - mark.height) // 2))
    mask = Image.new('L', (96, 96), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 95, 95), radius=19, fill=255)
    square.putalpha(mask)
    square.save(ROOT / 'public' / 'favicon.png', optimize=True)

for path in sorted(DEST.iterdir()):
    print(path.relative_to(ROOT), f'{path.stat().st_size / 1024:.1f} KB')
