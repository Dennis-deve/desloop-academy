# Desloop Academy

Desloop Academy is an in-progress, Ghana-first digital-skills learning platform. **It is not production-ready, open for enrolment or suitable for minors.** The single unreviewed curriculum draft has 44 required courses in one order; proposed GES/Cambridge/Oxford labels are **not** accreditation or official mappings.

## Current implementation and release boundary

**Local working branch `work/phase1-no-demo-release` (not yet pushed/deployed):** a read-only Desloop-branded course guide, searchable by title/stage, with 44 ordered draft outlines and honest availability/status. It has **no fake registration, school/partner dashboard, payment, AI, community or child action**. Direct visits to those retired simulated routes show an unavailable page; the built Fastify server returns HTTP 404. The public bundle contains only allowlisted course metadata—**not draft quiz questions, correct options or answers**. An automated build gate initially found correct options repeated in source outcome/focus text; those fields were removed from the public projection and the gate now passes. Historical browser-only source and tests are preserved in Git/`docs/archive`, but are not imported into the release or counted as product evidence.

**Existing GitHub `main` and Railway:** the previously verified commit `784b0ed` still runs a **domainless private adult/internal** API and Amsterdam PostgreSQL in the owner's existing `glorious-inspiration` project. The local no-demo branch has **not** reached GitHub or Railway: GitHub CLI is not authenticated and the prior temporary PAT was slated for revocation. Do not say the new release is deployed. Railway's `production`-named environment contains **synthetic internal test data only**, no public app/database domain, adult account, minor account or browser login for testers. See [remote deployment record](docs/RAILWAY_DEPLOYMENT_STATUS.md) and [current limitations](docs/KNOWN_LIMITATIONS.md).

The real `/pilot` API-backed adult draft-1 and additive `draft-2-candidate` engine remain in this branch. Operator invitations, Argon2/opaque sessions, assigned human review, 44-course order, server-owned seven states, version/policy hashes, revision/retakes, Course 08 guided declarative visual activity and separate ungraded saved practice were tested against **local disposable PostgreSQL**. They are internal rehearsals, **not official credit, verified age/email, a child account or a public browser-ready pilot**. Migrations 001–003 keep all guardian/child gates disabled. No public feature can grant progress by changing a URL, stage filter or browser storage.

The owner's five original GitHub JPEGs are preserved in `assets/brand-originals/`; optimized local assets are in `public/brand/`. The supplied curriculum and alignment PDFs informed a separately unpublished candidate; [source reconciliation](docs/BLUEPRINT_RECONCILIATION.md) keeps draft supplements and standards hints distinct from approved content. No final prices, contacts, commissions, terms, testimonials or qualifications have been invented.

## Run the real read-only guide locally

Requirements: **Node 22**, npm, Python 3 for catalogue validation; PostgreSQL 17+ only for **opt-in adult** integration.

```bash
npm ci
python3 scripts/build_public_catalog.py --check
npm run build:all              # release JS + Fastify, then refuses fake bundle/answer leakage
PILOT_ENABLED=false npm run dev:api  # terminal 1, real status endpoint on localhost:4000
npm run dev                    # terminal 2, http://127.0.0.1:5173
```

Browse `/`, `/courses`, a specific `/courses/:slug`, `/how-it-works` and `/availability`. The guide is informational: no account or durable visitor state is needed; its stage/search controls filter metadata and cannot unlock a course. The real private `/pilot` route is deliberately inaccessible for browser login on Railway until a reviewed same-origin private HTTPS ingress exists; **do not use a public Railway domain to bypass this hold**. For an isolated local adult pilot, follow [the operator runbook](docs/LEARNING_ENGINE_RUNBOOK.md) with a **new disposable database**, explicit acknowledgements and synthetic adult accounts only. Never put `DATABASE_URL` or secrets in a `VITE_` variable or repository.

## Verify and interpret results

```bash
npm run typecheck && npm run lint
python3 -m unittest discover -s scripts/tests -v
npm test
npm run test:server           # PostgreSQL integration cases skip without disposable DB envs
npm run build:all             # includes npm run verify:release
npm audit --audit-level=low
npx playwright install chromium
npm run test:e2e              # desktop/mobile public guide + brand + axe; adult E2E skip by default

# Destructive test resets permitted ONLY for four distinct disposable local PostgreSQL DBs.
PILOT_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_pilot_test' \
ENGINE_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_engine_test' npm run test:server
# For adult browser tests, also use separate PILOT_E2E_DATABASE_URL and ENGINE_E2E_DATABASE_URL.
```

**Actual local results on this working branch (22 October 2026):** **9 Python**, **14 frontend** and **18 server tests** passed with two separate disposable PostgreSQL integrations; default browser run **24 desktop/mobile guide/brand/axe passes, 4 expected adult opt-in skips**. Separately, one adult draft-1 and one draft-2 full browser/database journey each passed against their **own disposable** PostgreSQL database. Node **22.23.4** typecheck/lint/build passed; `npm audit --audit-level=low` found **0 vulnerabilities**. The release verifier detected then eliminated a public draft-answer leak; generated exact static URL rewrites replaced a broad fallback. Automated accessibility scans are **not WCAG 2.2 AA certification**; manual screen-reader and representative-user testing remain open. These are **local** results, not a new Railway deployment. Full evidence/expected-versus-actual: [test strategy](docs/TEST_STRATEGY.md).

## Working structure and feature control

```text
src/main.tsx, src/app/ReleaseRouter.tsx          No-demo runtime entry and route allowlist
src/features/public/ReleasePages.tsx             Read-only course/availability/404 flows
src/curriculum/{master,public-catalog}.json      Draft source vs metadata-only projection
scripts/build_public_catalog.py                  Regenerate/check safe public projection
scripts/verify_release_bundle.mjs                Postbuild release guard
src/features/pilot, server/src, server/migrations Adult-only API and versioned learning engine
server/src/public-routes.ts                      HTTP 200/404 SPA route boundary
src/components/ui, src/styles                    Shared accessible design baseline
assets/brand-originals, public/brand             Owner identity and web derivatives
docs/archive/browser-only-tests                  Retired simulation evidence, NOT release QA
```

Begin with [feature status/acceptance](docs/FEATURE_REGISTER.md), [requirements](docs/PRODUCT_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [HCI rules](docs/HCI_AND_PERSUASIVE_DESIGN.md), [risks](docs/SECURITY_AND_PRIVACY.md), [integrations](docs/INTEGRATIONS.md), [operations](docs/OPERATIONS.md) and [decision log](docs/DECISIONS.md). Every new feature must have a separate ID, real permissions/persistence where required, error recovery, tested user flow and recorded evidence before it is marked complete. Broader AI, payments, schools, partner accounting, desktop/offline, child safety and community remain required future work, **not** silently dropped.

**GitHub handoff:** work is committed on a safe local branch, not pushed to `main` without fresh owner-approved credentials. Once authorised, verify remote history; fast-forward only after review and run `git push origin main`. Then inspect the Railway deployment result, private health/denial gates and public-domain count; a successful Git push alone does not verify a hosted release. Previous Railway setup/rollback: [private Railway runbook](docs/RAILWAY_PRIVATE_ADULT_SETUP.md). Do not reuse or expose the retired temporary PAT.
