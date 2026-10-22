# Desloop Academy

A branded, responsive React/TypeScript learning app with **two deliberately separate trust levels**:

1. **Public site and role workspaces:** runnable **browser-only demonstrations**. Demo sign-in, role switching, sample AI, payments, commissions, applications, messaging, child/guardian views and local course/reviewer actions are **simulated**; they do not grant real access, send messages, charge money or create official completion.
2. **`/pilot`: a working server-backed, invitation-only adult/internal draft pilot** for identity, one required 44-course progression and assigned human review. The pilot has been tested against **local PostgreSQL**, but **has not been deployed to Railway** or published as an official programme. It has no age/email verification, minor enrolment, school accounts, public credentials or official credit.

> **Editorial and safeguarding status:** `draft-1` contains 44 course blueprints, 176 lesson outlines, illustrative checks and draft rubrics. This material has **not** received expert review, accessibility/child-safety sign-off or accreditation. The public demo bundles draft answer keys, so this is not a secure exam bank. Do not enter real child, confidential, payment or other sensitive information in either journey.

The supplied five JPEG brand images came from the user's [existing GitHub repository](https://github.com/Dennis-deve/desloop-academy). Originals are preserved in `assets/brand-originals/`; optimized local WebP derivatives appear throughout the site. The earlier synthetic hero concept was removed. See [brand details](docs/BRAND.md).

## Quick start

Requirements: **Node.js 22.x**, npm, and a browser. A normal public/demo preview needs **no database**:

```bash
cd desloop-academy
npm ci
npm run dev                    # http://127.0.0.1:5173
```

Visit `/courses` for all 44 required courses and `/demo` for illustrative role workspaces. Optional standalone workshops are under `/sample-courses`. The `/sign-in` and `/register` routes outside `/pilot` are **not** real accounts. Do not enter a real password there.

For the **separate adult pilot**, create a dedicated local PostgreSQL database, build the server, migrate, enable the explicit draft gate and start the API. `npm run dev` proxies same-origin `/api` to port 4000:

```bash
npm run build:all
export DATABASE_URL='postgresql://local_user@127.0.0.1:5432/desloop_pilot_local'
npm run pilot:migrate
export PILOT_ENABLED=true PILOT_DRAFT_ACKNOWLEDGED=true
export APP_ORIGIN=http://127.0.0.1:5173 NODE_ENV=development
npm start                      # API and built site at :4000
# In a second terminal: npm run dev
# Visit http://127.0.0.1:5173/pilot
```

An operator issues one-time adult/reviewer invitations and assigns projects using `npm run pilot:admin -- ...` from a restricted shell. The browser cannot choose a pilot role. See [deployment and operator instructions](docs/DEPLOYMENT.md) for commands, Railway configuration, environment boundaries and **destructive test-DB warnings**. Never commit `.env`, a database connection string, credentials, an invitation code or a personal record. All `VITE_` values are public.

## The required pathway

The **one mandatory sequence** has 44 courses across nine stages: digital foundations, computational thinking, creation, web, programming, data/AI, networks/safety/cloud, interactive technology, then career and capstone. Later courses cannot be skipped. The demo adapts teaching examples/scaffolds for ages 6–8, 9–12, 13–17 and 18+ without bypassing outcomes; **this age selector is not verification or a permission for children to join the pilot**. Enrichment and remediation stay in the current course. Human review is required for the project; no learner is required to publish private data.

For the **adult pilot only**, server-side transactions enforce: all four ordered practice checks, a server-scored five-item quiz (≥80% **and all critical safety items**), a privacy-attested text project, an operator-assigned active reviewer, rubric project and overall ≥70%, safety ≥70% with explicit approval, and a matching content/policy version. Revisions stay in the same course; the server alone writes completion and Course N+1 unlock. This is still an **internal rehearsal**, not an awarded qualification.

| Route | Boundary |
| --- | --- |
| `/`, `/explore`, `/courses`, `/courses/:slug`, `/pricing` | Public informational **draft/demo**, including ordered course map and illustrative terms. |
| `/demo`, `/app`, `/app/learn/*`, `/app/assess/*`, `/facilitator/pathway-reviews` | Browser-only role, lesson, quiz and reviewer **simulation**. LocalStorage and demo role switches are not security. |
| `/partner`, `/school`, `/classroom`, `/parent`, `/facilitator`, `/admin`, `/workspace/*` | Illustrative partners, tenants, guardian links, billing, sample AI, messages, offline content and other workflows. **No authoritative services.** |
| `/pilot`, `/pilot/courses/:courseId`, `/pilot/reviews` | **Separate PostgreSQL-backed adult/internal pilot**, available only after API, migration and explicit operator enablement. Disabled/unavailable state otherwise. |

See [curriculum guide](docs/CURRICULUM.md) and the [44-course Word reference](Desloop_Academy_Master_Curriculum.docx). The Word file can be regenerated from the JSON with `python3 scripts/export_curriculum.py` (requires `python-docx`). Do not use the draft as a published syllabus without a full review.

## Verify

```bash
npm run typecheck && npm run lint
npm run test                   # frontend demo Vitest tests
npm run build:all             # Vite + compiled Fastify API/CLI
npm audit --audit-level=low
npx playwright install chromium
# Linux only if needed: npx playwright install-deps chromium
npm run test:e2e              # desktop/mobile; DB pilot E2E skipped by default

# ONLY against a disposable, dedicated local DB (the test TRUNCATES pilot data):
PILOT_TEST_DATABASE_URL='postgresql://.../desloop_pilot_test' npm run test:server
# Browser full flow also TRUNCATES its separate E2E DB and needs the running API:
PILOT_E2E_DATABASE_URL='postgresql://.../desloop_pilot_e2e' npm run test:e2e
```

**Verified here:** 28/28 frontend Vitest tests; 3/3 server/policy tests against a disposable local PostgreSQL DB under Node 22; 44 standard desktop/mobile Playwright passes with four skips (two intentional desktop cases plus two opt-in pilot cases); then 2/2 separate PostgreSQL-backed pilot browser journeys, desktop and mobile. Typecheck, lint, full static/server build and `npm audit --audit-level=low` passed with zero reported vulnerabilities. This is local verification, **not Railway deployment or security certification**. Axe A/AA-tag tests assist accessibility review but **do not certify WCAG 2.2 AA**. A previously visited static shell may load offline, but cold-first-visit offline and pilot account API usage are not available offline. The service worker does not cache API requests.

## Key directories and source of truth

```text
assets/brand-originals/     Preserved user-provided brand JPEGs
public/brand/               Optimised web derivatives
src/config/site.ts          Configurable draft copy, contacts, plan/commission placeholders
src/curriculum/master.json  One 44-course, nine-stage unreviewed source document
src/curriculum/             Browser-only demo policy and local practice state
src/features/pilot/         Isolated API-backed adult learner/reviewer experience
server/src/                 Fastify, release policy, sessions/CSRF, progression and operator CLI
server/migrations/          PostgreSQL pilot schema
server/tests/               Real-Postgres API/policy integration tests (opt-in DB)
e2e/                        Desktop/mobile/demo and opt-in live-pilot browser/axe journeys
docs/                       Curriculum, brand, architecture and Railway handoff
```

See [architecture and trust boundaries](docs/ARCHITECTURE.md), [Railway handoff](docs/DEPLOYMENT.md) and [brand usage](docs/BRAND.md). No final prices, commissions, contacts, legal terms, partner claims or outcomes have been invented. Keep them centrally configured and subject to approval.

## Not yet done

**No Railway resource, hosted app URL or Railway database migration has been created from this work.** The source targets the existing [Desloop Academy GitHub repository](https://github.com/Dennis-deve/desloop-academy); check its current `main` branch for the latest publication state. Before real/minor enrolment or commercial launch: expert-approve immutable content and a protected assessment bank; add verified age/guardian consent, school isolation, reviewer MFA/recovery and safeguarding operations; build secure uploads, moderation, real AI/messaging, approved payments/commission ledger and audited entitlements; provide retention, data-rights, backups/restore, monitoring, security review and manual accessibility sign-off. Browser demo controls must never be promoted to production authority.
