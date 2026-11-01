# Desloop Academy

Desloop Academy is an in-progress, Ghana-first digital-skills learning platform. **It is not production-ready, open for enrolment or suitable for minors.** The single unreviewed curriculum draft has 44 required courses in one order; proposed GES/Cambridge/Oxford labels are **not** accreditation or official mappings.

**1 November 2026 update:** GitHub `main` now reads UI-02 commit `14f02d92ea0f04bccd3a90b7ab1ca9f8f1dc4fe1`; [its CI `verify` job passed](https://github.com/Dennis-deve/desloop-academy/actions/runs/41271781759), while manual public Render promotion was skipped. GitHub reported Railway deployment success, **not** a verified private runtime or project-core activation. The owner chose **Render for future app hosting through final production**, beyond the existing public-only guide. This is a hosting **direction**, not approval to create paid services, move the current Railway app or PostgreSQL, enable users/children, expose ingress or go live. The later **D21 synthetic development plan** reuses the existing static guide and targets one new inactive/public Render web service plus a free Neon Frankfurt database; a Railway data copy is conditional on fresh inventory and backup. None of these new resources or migrations has been verified here. See [decisions D19–D21](docs/DECISIONS.md), [owner setup steps](docs/RENDER_NEON_OWNER_SETUP_2026-11-01.md) and [Render setup](docs/RENDER_DEPLOYMENT.md). The dated 31 October source/UI-02-local-only paragraphs below are historical and superseded by this update; their release blockers still apply.

**Historical source and release boundary (31 October 2026):** After the owner's specific approval of a fresh temporary write-enabled SSH deploy key, the adult-only editor-agnostic project API and connected data-only JSON client were **non-force pushed to GitHub `main` `56411021c9505c9dd6179f5c4cb0d401c050c68a`**. [The real GitHub `verify` run passed](https://github.com/Dennis-deve/desloop-academy/actions/runs/41246188703) across five separate disposable CI databases; manual Render promotion was skipped. GitHub reports a Railway deployment success for that SHA **before CI completed**, but Railway dashboard flags, ingress/domains, DB/migrations and health are **not verified**. The private SSH key was destroyed: **the owner must remove its unused write-enabled public deploy key from GitHub Settings**. Migration 005 and `PROJECT_CORE_ENABLED` remain local-only/default-off in reviewed source, not a remotely confirmed flag. No approved adult stage, paid service, child access, licensed editor, preview, PNG upload UI, school tenant or assessed credit follows from the push. [Remote/local evidence](docs/evidence/project-core/GITHUB_VERIFY_AND_DRAFT_RECOVERY_2026-10-31.md) · [single feature register](docs/FEATURE_REGISTER.md) · [runbook](docs/PROJECT_CORE_RUNBOOK.md).

**Later local-only improvement (not on GitHub `main`):** STU-CORE-UI-02 recovers existing-document unsaved text within the same mounted adult pilot tab **only after an owner-authorised server GET**, preserves an unknown save's identical replay intent, requires explicit comparison when the server has advanced, and clears memory on sign-out/account switch/exit. It is not durable offline storage or router-wide navigation protection. Local Node 22/frontend **36/36**, four-DB server **31/31**, real fifth-DB adult browser desktop/mobile **2/2**, public regressions and both dependency audits (**0**) passed. It has **no new remote CI or deployment**. Private ingress/identity, Ghana privacy/retention/erasure, backup, security/override and representative manual accessibility/usability checks remain blocked. No further push credential or approval is retained.

## Current implementation and release boundary

**No-demo candidate (initial feature commit `201a1e4` pushed to GitHub `main` on 22 October 2026; Railway rollout not verified):** a read-only Desloop-branded course guide, searchable by title/stage, with 44 ordered draft outlines and honest availability/status. It has **no fake registration, school/partner dashboard, payment, AI, community or child action**. Direct visits to those retired simulated routes show an unavailable page; the built Fastify server returns HTTP 404. The public bundle contains only allowlisted course metadata—**not draft quiz questions, correct options or answers**. An automated build gate initially found correct options repeated in source outcome/focus text; those fields were removed from the public projection and the gate now passes. Historical browser-only source and tests are preserved in Git/`docs/archive`, but are not imported into the release or counted as product evidence.

**GitHub source versus Railway runtime:** `main` now reads `56411021c9505c9dd6179f5c4cb0d401c050c68a`, with a successful [GitHub CI run](https://github.com/Dennis-deve/desloop-academy/actions/runs/41246188703). GitHub's Railway deployment record for this SHA also reports success, **before CI finished**; it is not an inspection of the actual private health, migrations, flags, domains or DB proxy in the Railway dashboard. The last fully inspected private deployment is older `784b0ed`. The owner briefly added a public Railway domain and removed it; its former URL returned **Railway edge 404** on `/`, `/pilot` and `/api/health`, which proves only that *one former URL* no longer routes. The public guide remains separately hosted on Render at the older `62cbf7b…` receipt. See [prior deployment record](docs/RAILWAY_DEPLOYMENT_STATUS.md) and [current limitations](docs/KNOWN_LIMITATIONS.md).

The real `/pilot` API-backed adult draft-1 and additive `draft-2-candidate` engine remain in this branch. Operator invitations, Argon2/opaque sessions, assigned human review, 44-course order, server-owned seven states, version/policy hashes, revision/retakes, Course 08 guided declarative visual activity and separate ungraded saved practice were tested against **local disposable PostgreSQL**. They are internal rehearsals, **not official credit, verified age/email, a child account or a public browser-ready pilot**. Migrations 001–003 keep all guardian/child gates disabled. No public feature can grant progress by changing a URL, stage filter or browser storage.

The owner's five original GitHub JPEGs are preserved in `assets/brand-originals/`; optimized local assets are in `public/brand/`. The supplied curriculum and alignment PDFs informed a separately unpublished candidate; [source reconciliation](docs/BLUEPRINT_RECONCILIATION.md) keeps draft supplements and standards hints distinct from approved content. No final prices, contacts, commissions, terms, testimonials or qualifications have been invented.

## Live read-only Render site and continuous verification

On 29 October the owner selected the **real searchable read-only guide first**, CI on changes, and a **manual public promotion**; paid private adult staging was deferred. The root `render.yaml` contains **only** a public static site with auto-deploy off. `npm run build:render-public` makes a different `dist/render-public` artifact with no `/pilot` or `/api` code, plus a public source-commit receipt for checking the actual hosted release. The availability page honestly says private status is unknown, and the 47 deep-link rewrites are exact, not a wildcard. **Live public site:** [desloop-readonly-guide.onrender.com](https://desloop-readonly-guide.onrender.com). Its `/release.json` matched GitHub `main` commit `62cbf7b…`; hosted HTTP passed **five guide 200s/nine private-or-unknown 404s**, CSP checks and **6/6 desktop/mobile browser** assertions. Both [work CI](https://github.com/Dennis-deve/desloop-academy/actions/runs/40923040670) and [main CI](https://github.com/Dennis-deve/desloop-academy/actions/runs/40925689449) passed. This is a real read-only site, **not the complete interactive platform**. No paid Render database, real AI provider request or private adult browser ingress was created/verified. GitHub's future manual public-promotion environment/hook and Railway's private configuration still need owner setup/inspection; manual accessibility/legal review remains open. The adult service/database path is a deliberately non-deployable opt-in template until regional, cost, legal and secure-access decisions are made; it has no public browser URL. A preview or CI build is not a hosted staging service. See the [CI/CD owner handoff](docs/CONTINUOUS_DELIVERY.md), [step-by-step Render guide](docs/RENDER_DEPLOYMENT.md) and [single authoritative feature register](docs/FEATURE_REGISTER.md).

```bash
npm ci --ignore-scripts
npm run build:render-public      # Node 22 only; separate static artifact and source/bundle gates
npm run test:render-public       # local HTTP 200/404 assertions, not Render observations
npm run test:render-deploy       # stubbed hook/receipt/boundary tests, no real deployment
npm run test:e2e:render-public   # optional desktop/mobile Chromium, needs Playwright browser/deps
node scripts/serve_render_public.mjs  # optional read-only local browser inspection :4173
```

**Main-push warning:** the existing Railway adult/internal project also watches GitHub `main` with `checkSuites: false` in source. A push can trigger Railway **before CI**; have the owner pause it or inspect its actual deployed SHA, closed domain/origin and AI/child holds after pushing. No old GitHub token may be reused. Do not connect the public Render URL to the Railway or Render private service as a shortcut. For future features, the Actions workflow tests work branches/PRs and only an owner dispatch after a green check may request the pinned public commit; the **Render site exists**, but the GitHub `public-guide` environment/secret and manual promotion are **not yet verified**. See [release gates](docs/CONTINUOUS_DELIVERY.md).

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

# Server test resets permitted ONLY on four distinct disposable loopback DBs; never Railway.
# Opt-in project-client browser testing uses a separately migrated fifth disposable loopback DB.
PILOT_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_pilot_disposable_test' \
ENGINE_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_engine_disposable_test' \
AI_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_ai_disposable_test' \
PROJECT_CORE_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_project_core_disposable_test' npm run test:server
# Adult browser opt-in also requires two further separate disposable E2E DBs.
```

**Actual local results on this working branch (22 October 2026):** **9 Python**, **14 frontend** and **18 server tests** passed with two separate disposable PostgreSQL integrations; default browser run **24 desktop/mobile guide/brand/axe passes, 4 expected adult opt-in skips**. Separately, one adult draft-1 and one draft-2 full browser/database journey each passed against their **own disposable** PostgreSQL database. Node **22.23.4** typecheck/lint/build passed; `npm audit --audit-level=low` found **0 vulnerabilities**. The release verifier detected then eliminated a public draft-answer leak; generated exact static URL rewrites replaced a broad fallback. Automated accessibility scans are **not WCAG 2.2 AA certification**; manual screen-reader and representative-user testing remain open. These are **local** results, not a new Railway deployment. Full evidence/expected-versus-actual: [test strategy](docs/TEST_STRATEGY.md).

**29 October follow-up on the unpublished CI/CD branch:** Node 22 build/typecheck/lint, **25/25** frontend, **28/28** server on three new disposable local DBs, **9/9** Python, **1/1** local public HTTP, **3/3** synthetic deploy-boundary tests, default Playwright **24 passed/4 expected opt-in adult skips**, isolated public Playwright **6/6**, and `npm audit --audit-level=low` **0 vulnerabilities** after upgrading Zod to patched v4 passed locally. `actionlint` parsed the new GitHub Actions workflow. **No remote Actions run, Render hosted smoke or real provider call is implied.** [CI/CD source and owner setup](docs/CONTINUOUS_DELIVERY.md).

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

For the step-by-step **private verification → full public rollout plan**, start with [deployment guide](docs/DEPLOYMENT_GUIDE.md) and its [blank evidence worksheet](docs/DEPLOYMENT_EVIDENCE_TEMPLATE.md). These are planning documents; they do not activate a service or approve real users. For implementation, begin with [feature status/acceptance](docs/FEATURE_REGISTER.md), [requirements](docs/PRODUCT_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [HCI rules](docs/HCI_AND_PERSUASIVE_DESIGN.md), [risks](docs/SECURITY_AND_PRIVACY.md), [integrations](docs/INTEGRATIONS.md), [operations](docs/OPERATIONS.md) and [decision log](docs/DECISIONS.md). Every new feature must have a separate ID, real permissions/persistence where required, error recovery, tested user flow and recorded evidence before it is marked complete. Broader AI, payments, schools, partner accounting, desktop/offline, child safety and community remain required future work, **not** silently dropped.

**GitHub and deployment handoff:** the owner provided temporary authorisation for a non-force push to `main`; initial feature commit `201a1e4` was verified remotely. No GitHub CLI login or token was saved. **The owner should revoke that temporary authorisation.** Inspect Railway's new deployment SHA/result, private health, anonymous-denial and child-hold gates, and public-domain count using separately authorised Railway access; GitHub success alone does not prove a hosted release. Use [the private Railway runbook](docs/RAILWAY_PRIVATE_ADULT_SETUP.md) for safe access/rollback. Future changes require fresh authorised pushes; never reuse or expose the retired earlier PAT.
