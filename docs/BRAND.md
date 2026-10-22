# Desloop brand assets and provenance

The owner's [existing Desloop Academy GitHub repository](https://github.com/Dennis-deve/desloop-academy) supplied the five original JPEGs at the first integration (then commit `880f334`). They remain unchanged in `assets/brand-originals/`. Locally optimized WebP/PNG derivatives are in `public/brand/`, `public/favicon.png` and `public/apple-touch-icon.png`; no generated hero image or synthetic infinity logo replaces them. The FND-01 release displays the original identity via these local derivatives, **not** a hosted external image or a misleading school/partner logo.

| Preserved original | Local derivative | Current use |
|---|---|---|
| `dl-academy.jpg` | `wordmark-dark.webp` | Available as a configurable approved brand asset; not a fabricated hero. |
| `dl-white background.jpg` | `wordmark-light.webp` | Available for a light-surface identity treatment after visual review. |
| `monochrome-version.jpg` | `wordmark-mono.webp` | Footer identity in the public release. |
| `standalone-brandmark.jpg` | `brandmark-dark.webp`, `favicon.png` | Header and home identity card, browser icon. |
| `desloop-mobile-app-icon.jpg` | `app-icon.webp`, `apple-touch-icon.png` | Touch icon and local asset; no released mobile app is implied. |

React image paths are centrally configured in `src/config/site.ts`. Navy, violet and spectrum-accent styling follows the supplied artwork, but body text and status use independent contrast. JPEGs have opaque backgrounds; preserve aspect ratio and check the actual light/dark surface before using an alternative wordmark. The **old static offline shell is retired** because it could replay obsolete simulated routes; the current public guide does **not** claim offline caching or sync.

To regenerate derivatives after an **owner-approved** brand update:

```bash
python3 -m pip install Pillow
python3 scripts/prepare_brand.py
npm run build:all
```

Review resulting crops on desktop/mobile and rerun image-loading, accessibility and release-bundle checks. The visible artwork says “by Destech Solutions”; that text in an original image is **not** independent verification of legal ownership, commercial terms, sponsor status or a deployed service. Confirm media rights, logo masters, minimum sizes and legal/operator wording with the owner before a public launch.
