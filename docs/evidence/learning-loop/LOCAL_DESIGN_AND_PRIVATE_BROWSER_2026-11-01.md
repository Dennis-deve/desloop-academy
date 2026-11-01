# Learning-loop design + real private dashboard: local evidence

**Date:** 1 November 2026. **Branch:** `work/artifact-learning-loop-owner-only`, branched from merged `b8737ea6ecfc1362a6b0d6e6511865d92606ea9b`. This branch is **local only**; the earlier AI free-catalog/cooldown branch is separate and is not a live free-only inference capability. No Render web/Neon Frankfurt resource, push, PR, deployment, hosted account or real-minor test is claimed.

## Scope and decisions

The owner uploaded `/home/user/uploads/Desloop Academy.html` as visual direction and chose **both** an integration into the genuine gated private adult dashboard and a separately viewable corrected interactive design file. They chose **hide AI actions until approved**. The uploaded compiled example's mock sign-in, fictional learner/64% and invented weekly activity were **not** copied. In its dark scheme its footer resolved to near-white `rgb(243,241,255)` while text and links stayed near-white. The new footer is always `rgb(20,20,49)` and links `rgb(242,243,255)` in both themes, verified in the browser.

## Deliverables and reproducibility

- `/home/user/Desloop_Learning_Loop_Design_Review.html` — approximately 543 KiB self-contained, offline React/Framer Motion design review; bundled local Bricolage Grotesque and Instrument Sans, original brand mark, and the safe 44-course draft metadata. The HTML has no live API, sign-in, score, AI button, provider response or stored learner activity. Build from source: `npm run build:learning-loop-review` (writes the HTML beside the repository). Browser suite: `npm run test:learning-loop-review`. A separate Chromium check also mounted the exact file in an `iframe sandbox="allow-scripts"` without a network origin and exercised its orbital stage control.
- Private app `/pilot` adult-learner overview — real invitation/session required; same component receives server-authorised draft-1 pathway and `/api/pilot/dashboard/activity`. Reviewers retain their assigned review view. The chart counts *actions* by seven UTC dates, with separate enabled draft-2 events; no study-time estimates or client-awarded credit. GET is learner-only and `Cache-Control: private, no-store`. On failure the chart says **unavailable**. Lab code runs locally and does not alter the chart or completion. A separate existing persisted project studio is linked only when the engine is enabled. Locked course access still fails on the server.
- [Light desktop viewport](design-desktop-light.png), [light mobile viewport](design-mobile-light.png), [dark footer capture](design-footer-dark.png) are **design-only** screenshots, not invented account results.

## Executed checks (Node 22.23.4, local PostgreSQL 17)

| Check | Observed result |
| --- | --- |
| `npm run test:server` on four **new**, separate PostgreSQL databases with a one-run SQL role; all four DBs/role removed after | **40/40**, zero skips; new tests cover anonymous/reviewer denial, other-learner isolation, repeated request IDs not double-counted, draft-1 and enabled draft-2 source selection, real lesson/quiz/project actions and `private, no-store`. |
| `npm test` | **41/41** including actual block interpreter, age lens, review empty state, private synthetic prop boundaries and malformed activity fail-closed recovery; new Playwright suite excluded from Vitest discovery. |
| `npm run test:e2e:pilot-dashboard` on a **fifth new** named PostgreSQL DB, separately prepared only after verifying it had no pilot schema; discarded afterwards | **2/2** desktop + mobile. Real invitation, server-owned initial `0/44` and `0` actions, block run without credit, stage/age interaction, 320 CSS-pixel reflow, dark footer and automated axe; real lessons create `4` chart actions; quiz, project, assigned human approval and server-verified `1/44` next-course unlock all passed. |
| `npm run test:learning-loop-review` | **8/8** desktop + mobile: offline/no network; all four orbit controls; pointer and keyboard reorder; actual bounded SVG steps and reduced motion; 44-course pagination/stage/search/age filtering; light/dark footer, WCAG 2.2 A/AA axe scan, no overflow. |
| `npm run test:e2e` (disabled private stage), `npm run test:e2e:render-public` | **24 passed/4 expected private DB skips**, **6/6** isolated public guide. |
| `npm run typecheck`, `npm run lint`, `npm run build:all`, `npm run build:render-public`, Node static-host/deploy contract tests, Python unit tests, `git diff --check` | Passed; public Render artifact confirms **no private API/pilot/AI chunk or assessment question text**; release bundle verifies **44 metadata-only outlines**; Python **9/9**. |
| `npm audit --audit-level=low`, `npm audit --omit=dev --audit-level=low` | **0 vulnerabilities** in both reports. |

Automated axe is **not** manual assistive-technology verification. No hosted Neon/Render, upstream AI, child workflow or real-person usability test has been run. The UI cannot become production-ready solely from these local checks. Owner PR/CI, manual AT, independent safeguarding/privacy/security and hosted synthetic-only checks remain outstanding.
