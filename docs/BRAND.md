# Desloop brand assets

The user supplied [their Desloop Academy GitHub repository](https://github.com/Dennis-deve/desloop-academy) as the source of the images for this frontend. On integration, its `main` branch at commit `880f334` contained five JPEG brand files and no application code. Originals are preserved unchanged in `assets/brand-originals/`; website-friendly local WebP/PNG derivatives live in `public/brand/`, `public/favicon.png` and `public/apple-touch-icon.png`. The earlier AI-generated hero image and synthetic infinity SVG were removed.

| Original file in repo         | Derivative                              | Where it appears                             |
| ----------------------------- | --------------------------------------- | -------------------------------------------- |
| `dl-academy.jpg`              | `wordmark-dark.webp`                    | Branded homepage hero                        |
| `dl-white background.jpg`     | `wordmark-light.webp`                   | About-page identity panel                    |
| `monochrome-version.jpg`      | `wordmark-mono.webp`                    | Public footer                                |
| `standalone-brandmark.jpg`    | `brandmark-dark.webp`, `favicon.png`    | Public/workspace navigation and browser icon |
| `desloop-mobile-app-icon.jpg` | `app-icon.webp`, `apple-touch-icon.png` | Demo workspace selector and touch icon       |

Image paths used in React are configured centrally in `src/config/site.ts`. The app ships them locally rather than hotlinking GitHub; the narrow offline shell also caches visited `/brand/` assets. Surrounding navy, violet and spectrum accent styling takes its direction from the supplied artwork, with text contrast maintained independently of the rainbow mark. The source JPEGs have opaque backgrounds: show the dark logos on dark surfaces and the light logo on light surfaces, without stretching or pretending they have transparency.

To regenerate optimised assets after a brand update, replace the five original JPEGs with owner-approved versions and run:

```bash
python3 -m pip install Pillow
python3 scripts/prepare_brand.py
npm run build
```

Check the resulting crops on desktop and mobile, and rerun accessibility, image-loading and offline tests. The visible artwork says “by Destech Solutions”; that is source-image text, **not independent verification of legal ownership, commercial terms or a deployed service**. Confirm media rights, the official logo master files, minimum sizes and legal/operator wording with the brand owner before release.
