# Desloop Academy

A branded, responsive React/TypeScript learning app with **two deliberately separate trust levels**:

1. **Public site and role workspaces:** runnable **browser-only demonstrations**. Demo sign-in, role switching, sample AI, payments, commissions, applications, messaging, child/guardian views and local course/reviewer actions are **simulated**; they do not grant real access, send messages, charge money or create official completion.
2. **`/pilot`: a working, invitation-only adult/internal PostgreSQL pilot** for identity, assigned human review and one required 44-course progression. The original `draft-1` pilot remains unchanged. An **additive, explicitly enabled `draft-2-candidate` learning engine** in `/pilot/engine` adds seven server-maintained states, an ordered lesson/module/course gate, versioned release/policy, assigned review, a required server-checked visual-block lesson in Course 08 and a distinct private saved free-practice playground. It was tested against **local PostgreSQL** and deployed to an **existing domainless Railway project** with private PostgreSQL for synthetic adult/internal testing only. The hosted API is active inside Railway's private network, but there is no public domain or browser login for testers. Neither draft is an official programme or supports verified age/email, minors, schools, credentials or official credit.

> **Editorial and safeguarding status:** `draft-1` contains 44 course blueprints, 176 lesson outlines, illustrative checks and draft rubrics. This material has **not** received expert review, accessibility/child-safety sign-off or accreditation. The public demo bundles draft answer keys, so this is not a secure exam bank. Do not enter real child, confidential, payment or other sensitive information in either journey.

The supplied five JPEG brand images came from the user's [existing GitHub repository](https://github.com/Dennis-deve/desloop-academy). Originals are preserved in `assets/brand-originals/`; optimized local WebP derivatives appear throughout the site. The earlier synthetic hero concept was removed. See [brand details](docs/BRAND.md).

## Quick start

Requirements: **Node.js 22.x**, npm, and a browser. A normal public/demo preview needs **no database**:

```bash
cd desloop-academy
npm ci
npm run dev                    # http://127.0.0.1:5173
```

Visit `/courses` for all 44 required courses. The public header no longer advertises signup or a demo-first path; `/demo` remains an explicitly labelled **developer preview** with illustrative role workspaces. Its learner workspace has four primary destinations—Home, Learn, Make and My work—with Help/Settings separate and no learner role-switch control. Optional standalone workshops are under `/sample-courses`. The `/sign-in` and `/register` routes outside `/pilot` remain directly available as **simulated preview routes**, not real accounts. Do not enter a real password there.

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

An operator issues one-time adult/reviewer invitations and assigns projects using `npm run pilot:admin -- ...` from a restricted shell. The browser cannot choose a pilot role. **For the new additive draft-2 release**, follow the [engine migration, operator and Railway runbook](docs/LEARNING_ENGINE_RUNBOOK.md): `npm run engine:migrate` installs/verifies all three migrations, including the **hard-disabled child-access hold**, only after explicit draft acknowledgment; `npm run engine:admin -- engine-enrol ...` separately enrols invited adults. The new engine routes also require `ENGINE_V2_ENABLED=true`; they are otherwise unavailable. See the [guardian-consent/child-identity design](docs/GUARDIAN_CONSENT_AND_IDENTITY.md) and [private Railway checklist](docs/RAILWAY_PRIVATE_ADULT_SETUP.md)—neither enables minor accounts. The [original pilot handoff](docs/DEPLOYMENT.md) documents the unchanged draft-1 flow. Never commit `.env`, a database connection string, credentials, an invitation code or a personal record. All `VITE_` values are public.

## The required pathway

The **one mandatory sequence** has 44 courses across nine stages: digital foundations, computational thinking, creation, web, programming, data/AI, networks/safety/cloud, interactive technology, then career and capstone. Later courses cannot be skipped. The demo adapts teaching examples/scaffolds for ages 6–8, 9–12, 13–17 and 18+ without bypassing outcomes; **this age selector is not verification or a permission for children to join the pilot**. Enrichment and remediation stay in the current course. Human review is required for the project; no learner is required to publish private data.

For **both adult-only pilot releases**, server-side transactions enforce: all four ordered practice checks, a server-scored five-item quiz (≥80% **and all critical safety items**), a privacy-attested text project, an operator-assigned active reviewer, rubric project and overall ≥70%, safety ≥70% with explicit approval, and matching content/policy version. Revisions stay in the same course; the server alone writes completion and Course N+1 unlock. Draft-2 additionally persists the seven requested module/course states and permits only the **guided** Course 08 visual revision's independently server-checked evidence to satisfy `c08-l2`. Free practice, local previews, stage/tag filtering and prior draft-1 passes cannot unlock anything in the new release. These are still **internal rehearsals**, not awarded qualifications.

| Route                                                                                                                           | Boundary                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/explore`, `/courses`, `/courses/:slug`, `/pricing`                                                                       | Public informational **draft/demo**, including ordered course map and illustrative terms.                                                                                                     |
| `/demo`, `/app`, `/app/learn/*`, `/app/assess/*`, `/facilitator/pathway-reviews`                                                | Browser-only role, lesson, quiz and reviewer **simulation**. LocalStorage and demo role switches are not security.                                                                            |
| `/partner`, `/school`, `/classroom`, `/parent`, `/facilitator`, `/admin`, `/workspace/*`                                        | Illustrative partners, tenants, guardian links, billing, sample AI, messages, offline content and other workflows. **No authoritative services.**                                             |
| `/pilot`, `/pilot/courses/:courseId`, `/pilot/reviews`                                                                          | Original **draft-1** PostgreSQL-backed adult/internal pilot; requires enabled API, migration and explicit adult-draft acknowledgment.                                                         |
| `/pilot/engine`, `/pilot/engine/courses/:courseId`, `/pilot/engine/reviews`, `/pilot/engine/guided/*`, `/pilot/engine/studio/*` | **Additive draft-2-candidate**, separately migrated, flagged and operator-enrolled. Only Course 08's guided visual blocks are server-graded; private free practice is saved but never graded. |

See [curriculum guide](docs/CURRICULUM.md) and the [44-course Word reference](Desloop_Academy_Master_Curriculum.docx). The Word file can be regenerated from the active JSON with `python3 scripts/export_curriculum.py` (requires `python-docx`). Do not use the draft as a published syllabus without a full review.

**Source-informed candidate (opt-in local/internal only):** The owner supplied the five-page Master Curriculum PDF and three-page Global Alignment Strategy PDF. [Source reconciliation](docs/BLUEPRINT_RECONCILIATION.md) records 34 proposed strategy hints, 18 lesson supplements, 23 tool-placement proposals and the inclusive policy decision. Rebuild `src/curriculum/candidates/master-draft-2.json` with `python3 scripts/build_blueprint_candidate.py` and run `python3 -m unittest discover -s scripts/tests`. The new [implemented learning-engine runbook](docs/LEARNING_ENGINE_RUNBOOK.md) and [longer tool-stack proposal](docs/LEARNING_ENGINE_PROPOSAL.md) separate the **one implemented declarative visual tool** from staged future sandboxes. `src/curriculum/master.json` and draft-1 completions are untouched. The draft-2 engine, simplified preview navigation and disabled guardian-safety scaffold are on GitHub `main`. The owner's existing Railway `glorious-inspiration` project now has a private Amsterdam PostgreSQL service and a domainless adult/internal API with both adult draft flags enabled; the migrations and private health/denial checks passed. **No public host, tester browser access, real user accounts, minor accounts or official credit exists.** See the [actual Railway verification](docs/RAILWAY_DEPLOYMENT_STATUS.md) and [private setup/rollback checklist](docs/RAILWAY_PRIVATE_ADULT_SETUP.md).

## Verify

```bash
npm run typecheck && npm run lint
npm run test                   # 32 frontend/demo/navigation/block-editor Vitest tests
python3 -m unittest discover -s scripts/tests -v
npm run build:all             # Vite + compiled Fastify API/CLI
npm audit --audit-level=low
npx playwright install chromium
# Linux only if needed: npx playwright install-deps chromium
npm run test:e2e              # desktop/mobile; DB-backed journeys skipped by default

# Opt-in destructive integration tests: only against separate, disposable local DBs:
PILOT_TEST_DATABASE_URL='postgresql://.../desloop_pilot_test' \
ENGINE_TEST_DATABASE_URL='postgresql://.../desloop_engine_test' npm run test:server
# See docs/LEARNING_ENGINE_RUNBOOK.md for the local API and the separate
# ENGINE_E2E_DATABASE_URL/PILOT_E2E_DATABASE_URL browser test DB setup.
```

**Verified locally under Node 22:** 5/5 Python source-reconciliation tests, 32/32 frontend Vitest tests and 16/16 server/policy tests including two separate disposable PostgreSQL databases and database-enforced minor-access denial; typecheck, zero-warning lint, full static/server builds and `npm audit --audit-level=low` reported zero vulnerabilities. Desktop/mobile Playwright against a third disposable database and local API: **49 passed, one intentional desktop-only skip**, including draft-1 and draft-2 browser flows, Course 08 guided visual assessment and the simplified learner navigation. These are local regression results, separate from the [limited private Railway smoke test](docs/RAILWAY_DEPLOYMENT_STATUS.md); neither proves assessment validity, privacy compliance or security certification. Automated axe A/AA-tag checks assist accessibility review but **do not certify WCAG 2.2 AA**. A previously visited static shell may load offline; cold-first-visit offline and pilot account API usage are not available offline. The service worker does not cache API requests.

## Key directories and source of truth

```text
assets/brand-originals/     Preserved user-provided brand JPEGs
public/brand/               Optimised web derivatives
src/config/site.ts          Configurable draft copy, contacts, plan/commission placeholders
src/curriculum/master.json  One 44-course, nine-stage unreviewed source document
src/curriculum/             Browser-only demo policy and local practice state
src/features/pilot/         Isolated API-backed adult learner/reviewer experience
server/src/                 Fastify, release policy, sessions/CSRF, progression and operator CLI
server/migrations/          Additive 001 adult pilot + 002 engine + 003 blocked guardian groundwork
server/src/engine/          Draft-2 version/policy, PostgreSQL progression, review and visual interpreter
server/src/guardian/        No-PII safeguarding hold verification for the adult engine
server/tests/               Real-Postgres API/policy integration tests (opt-in disposable DBs)
e2e/                        Desktop/mobile/demo and opt-in live-pilot/engine browser/axe journeys
docs/                       Curriculum, brand, architecture, local and Railway runbooks
```

See [architecture and trust boundaries](docs/ARCHITECTURE.md), [draft-2 operator runbook](docs/LEARNING_ENGINE_RUNBOOK.md), [verified Railway status](docs/RAILWAY_DEPLOYMENT_STATUS.md), [private setup/rollback steps](docs/RAILWAY_PRIVATE_ADULT_SETUP.md), [guardian safety hold](docs/GUARDIAN_CONSENT_AND_IDENTITY.md), [original-pilot handoff](docs/DEPLOYMENT.md) and [brand usage](docs/BRAND.md). No final prices, commissions, contacts, legal terms, partner claims or outcomes have been invented. Keep them centrally configured and subject to approval.

## Not available for public or child use

**Railway's existing `glorious-inspiration` project now has a private Amsterdam PostgreSQL database and a domainless `desloop-academy` app running the adult/internal engine.** The reviewed 001–003 migrations and server-side health/denial checks passed; the database has zero enrolled adults and all child-data gates remain disabled. The [GitHub repository](https://github.com/Dennis-deve/desloop-academy) `main` carries the same source, but a domainless private API **is not a publicly available learning platform or a browser-ready pilot**. Before external adults, minors or commercial launch: expert-approve immutable content and protected assessments; add verified age/guardian consent, school isolation, reviewer MFA/recovery and safeguarding operations; build secure uploads, moderation, real AI/messaging, approved payments/commission ledger and audited entitlements; provide retention, data-rights, backups/restore, monitoring, security review and manual accessibility sign-off. Browser demo controls must never be promoted to production authority.
