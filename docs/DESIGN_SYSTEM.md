# Desloop design system — release baseline

The owner-supplied Desloop JPEGs are preserved unchanged in `assets/brand-originals`; optimized assets in `public/brand` are derivatives, not invented branding. React/Tailwind components in `src/components/ui` and tokens in `src/styles/index.css`/`tailwind.config.ts` remain the shared system. **This is a baseline, not WCAG certification.**

| Element | Current convention | Accessible interaction rule |
|---|---|---|
| Identity | Manrope Variable UI; DM Serif Display headings; owner brandmark/wordmarks; Ghana-first `en-GH` default. | Text never appears solely as an image; decorative images have empty alt and descriptive logo link. No fabricated statistics or commercial claims. |
| Semantic colours | Canvas/panel/raised/line/heading/body/subdued CSS tokens; ink/brand/mint/amber semantic accents. | Status has text as well as colour; high-contrast focus `--ring`. Verify individual combinations manually before expanding. |
| Spacing/size | Tailwind layout, max-page container, 320px minimum viewport, 44px+ primary controls; responsive grid. | No horizontal scroll at 320px; pointer spacing and visible keyboard focus. |
| Heading/layout | One H1 per public page, H2 sections, H3 details; header/main/footer landmarks and skip link. | Route change moves focus to main; nested pilot forms retain labelled fields and useful error text. |
| Actions | Primary solid = genuine route/action; outline = secondary; destructive styles reserved for real reversible/confirmed operations. | No action button represents fake enrolment/payment; real actions have pending/error/retry states. |
| Forms/search | Native labels, bounded inputs, native stage `<select>` and search type; contextual result count. | Search filters only public metadata; empty state offers reset; error leaves user work intact. |
| Navigation | Three public destinations (Courses, How learning works, Availability); mobile menu with expanded/controls state and route-close focus management. | No hidden role switch, duplicate fake signup, unsupported footer or dead CTA. |
| Status/feedback | Draft notice, service-check loading/active/inactive/unavailable; honest 404 and recovery. | `role=status` for changes, `role=alert` for blocking pilot errors; do not equate a provider request with completed work. |
| Media/motion | No autoplay; browser prefers-reduced-motion CSS media query in `src/styles/index.css`. | Alt/captions/transcripts required for instructional media when approved. Historical SW offline shell retired; offline sync is not claimed. |
| Advanced content | Native `<details>` for optional age-adaptation notes; core status/enrolment limits remain visible. | Progressive disclosure may not hide fees, privacy, safety or assessment requirements. |

**Component audit before reuse:** inspect `src/components/ui` and `src/components/layout/Logo.tsx`; use a consistent labelled component only where its behaviour actually meets the user story. The old simulated app shell/router is not a released design system or permission model. Dark-mode, comprehensive tables/dialogs/toasts, localisation and real-time states require their own verified feature work. Manual contrast/keyboard/screen-reader testing is still an open FND-01 gate; axe/browser tests alone are insufficient.
