# Draft-2 learning engine — operator runbook

**22 October 2026 · internal adult rehearsal only.** The additive `learning.*` engine, simplified learner preview and `003_guardian_groundwork.sql` safety hold have been tested locally and pushed to GitHub `main`; **a domainless GitHub-connected Railway app service exists, but no PostgreSQL service, hosted adult-engine migration, enabled adult route or official completion exists**. Verify the current remote SHA before any deployment. Read [the PDF reconciliation](BLUEPRINT_RECONCILIATION.md), [the private Railway steps](RAILWAY_PRIVATE_ADULT_SETUP.md), [the guardian safety design](GUARDIAN_CONSENT_AND_IDENTITY.md) and [the architecture](ARCHITECTURE.md). Do not enter child data or represent this as a published curriculum.

## What is actually implemented

- `001_adult_pilot.sql` and active `src/curriculum/master.json` remain the separate `draft-1` pilot; its prior progress is **never imported or credited** in draft-2.
- `002_learning_engine.sql` creates additive release-pinned `learning.*` tables for 44 ordered courses, four ordered modules/lessons per course, seven module/course states, server-owned attempts/review/completion and private project revisions. The catalog is stamped with a SHA-256 and policy `blueprint-pilot-2`; immutable catalog/evidence rows have update/delete guards. Only the account already in `pilot.users` is reused.
- `003_guardian_groundwork.sql` adds a **hard-disabled** minor-access gate and eight outstanding legal, identity, consent and safeguarding review controls. It stores no child information and enables no consent service. `engine:migrate` installs it; draft-2 startup refuses a missing/changed gate, and a reviewer-only metadata endpoint shows pending controls. Minor accounts stay disabled.
- The **unpublished** `draft-2-candidate` is installed only with operator acknowledgment. The server enforces quiz **≥80%**, project, overall and safety **≥70%**, all critical checks, assigned human approval, contiguous completion and a single next-course unlock in one transaction. Browser URL changes, local role switches, free-play work and a stale release do not grant access.
- `/pilot/engine` exposes versioned pathway, courses, review queue and 34 **proposed strategy hints**, filterable **for display only**. GES/Cambridge/Oxford tags are not verified outcome mappings or accreditation; the official mapping tables remain empty. `VOCATIONAL_PRO` is an internal focus label.
- The only working embedded tool so far is a **small custom, keyboard-operable, declarative visual block composer** (`START`, `SAY`, `REPEAT`, `CHOICE`), not Blockly or arbitrary executable code. The required guided `course-08` / `c08-l2` activity saves immutable revisions and gets immediate, independent **server** feedback against versioned criteria; a passing run must reference that learner's latest guided revision before the lesson check can pass. `/pilot/engine/studio` saves separate private free-practice projects; they cannot be graded for the pathway or published. Adult account/password/session and CSRF protections are server-backed, not simulated.
- The 18 editorial PDF supplements, other 22 proposed tool placements, age bands, formal lesson authoring and school-system badges are **not** newly approved instruction or secure assessments. HTML/CSS/JS/Python/SQL, games, robotics/circuits, wireframing, spreadsheets and graphic design tools are **not implemented**. Do not run user code inside Fastify or attach a live database to a browser IDE.

## Step 1 — run locally, without deleting pilot data

Use **Node 22**, npm and PostgreSQL 17+; provision a _new dedicated local database_ and a trusted local PostgreSQL role with access to it. Never run test resets or `TRUNCATE` on a shared database. From the project root:

```bash
npm ci
python3 scripts/build_blueprint_candidate.py
python3 -m unittest discover -s scripts/tests -v
npm run typecheck && npm run lint && npm run test && npm run build:all
export DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_internal_local'
export PILOT_OPERATOR='Your identifiable internal operator name'
export ENGINE_DRAFT_ACKNOWLEDGED=true
npm run engine:migrate  # installs/verifies 001, 002 and the 003 child-safety hold
```

The CLI prints `Installed unpublished adult-only release draft-2-candidate; no learner is enrolled automatically.` If a release hash, policy or safety hold does not match, **stop and investigate**; do not hand-edit the catalog or copy `draft-1` completions into `learning.*`. Check a private local DB with an operator-controlled SQL console if desired: `learning.catalog_releases` status is `internal_draft`; course content = 44, modules = 176, lessons = 176, strategy hints = 34, visual specs = 1. The safeguarding gate remains `false` in all three minor-access columns, with eight `not_ready` controls and **no child records**. The old `pilot.content_versions` remains `draft-1`.

Now enable the API **only for invited adults/internal reviewers** after local safety review:

```bash
export PILOT_ENABLED=true PILOT_DRAFT_ACKNOWLEDGED=true
export ENGINE_V2_ENABLED=true
export APP_ORIGIN=http://127.0.0.1:5173 NODE_ENV=development
npm start                 # compiled Fastify :4000, separate terminal
# Second terminal in the same project root:
npm run dev               # Vite :5173; same-origin /api proxy → :4000
# Open http://127.0.0.1:5173/pilot
```

`ENGINE_V2_ENABLED=true` needs both the adult pilot and `ENGINE_DRAFT_ACKNOWLEDGED=true`. All flags default to off; `APP_ORIGIN` must match the **exact** origin in the browser, without a trailing slash. `/api/health` checks the DB when the pilot is on. The public demo remains a separate browser-only simulation.

## Step 2 — invite, enrol and review in the restricted shell

Use `DATABASE_URL`, `PILOT_OPERATOR` and `ENGINE_DRAFT_ACKNOWLEDGED=true` in a restricted operator terminal with the compiled `server/dist` available. Example email addresses and UUIDs below are placeholders, **not** real accounts:

```bash
npm run pilot:admin -- invite learner@example.invalid learner
npm run pilot:admin -- invite reviewer@example.invalid reviewer
# Deliver each one-time invitation out of band, to an adult after verification.
# Each invited person registers at /pilot and sets a distinct password.
npm run engine:admin -- engine-enrol learner@example.invalid
npm run engine:admin -- engine-submissions
npm run engine:admin -- engine-assign <actual-pending-submission-uuid> reviewer@example.invalid
```

The learner opens `/pilot/engine` **after** `engine-enrol`, works Course 01 onward, and can open the separate private playground at any time while enrolled. The assigned reviewer signs into `/pilot/engine/reviews` and records a real human rubric/safety decision. Course 08's guided activity appears only after Courses 01–07 and `c08-l1` pass. `pilot:admin -- submissions/assign` is for **old draft-1**; `engine:admin -- engine-submissions/engine-assign` is for **new draft-2**. No browser can issue invitations, self-enrol or self-assign a reviewer. Existing `draft-1` work remains accessible on its separate pages. To revoke an adult account and its sessions, the original `npm run pilot:admin -- disable learner@example.invalid` command applies to both.

Never paste an invitation, password, database URL, personal record, SSH key or token into chat, commits, screenshots or logs. A `pilot` invitation only verifies possession of the code and a **self-attested** adult declaration; it is not age/email verification. Keep local test accounts fictional.

## Step 3 — regression against **disposable** PostgreSQL only

The opt-in server and browser suites **TRUNCATE** `pilot.users`, invitations and audit data with `CASCADE`. Use three separate databases that can be destroyed: one for each concurrent server suite and a third for the browser suites. Point the running local API's `DATABASE_URL` at the **browser** test DB (not either server-test DB). Example workflow, after `npm run build:all`:

```bash
# Create desloop_pilot_test, desloop_engine_test and desloop_engine_e2e locally first.
PILOT_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_pilot_test' \
ENGINE_TEST_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_engine_test' \
  npm run test:server

# Restart the API from Step 1 with DATABASE_URL pointing to desloop_engine_e2e,
# APP_ORIGIN=http://127.0.0.1:5173 and both pilot/engine flags enabled.
# Only for this loopback disposable E2E server, set:
export NODE_ENV=test PILOT_LOCAL_E2E_AUTH_LIMIT=true
export ENGINE_E2E_DATABASE_URL='postgresql://LOCAL_USER@127.0.0.1:5432/desloop_engine_e2e'
export PILOT_E2E_DATABASE_URL="$ENGINE_E2E_DATABASE_URL"
npx playwright install chromium
# On Linux if Chromium reports missing libraries: npx playwright install-deps chromium
npm run test:e2e
```

Browser tests run serially when either E2E URL is set. Both browser suites reset the same **E2E-only** account tables and reseed the candidate. The auth-limit increase is refused unless `NODE_ENV=test` **and** both `APP_ORIGIN` and `DATABASE_URL` use `127.0.0.1`; **never set** `PILOT_LOCAL_E2E_AUTH_LIMIT` in Railway. Leave it unset in ordinary local use. Playwright/axe checks are accessibility regression aids, not WCAG certification.

## Step 4 — private Railway engine rollout; **database/engine pending**

Follow the precise [private adult/internal setup checklist](RAILWAY_PRIVATE_ADULT_SETUP.md) **after verifying the reviewed source is on GitHub `main`**. It covers an isolated Railway project, private PostgreSQL only, no public app domain, Node 22, same-service private `DATABASE_URL` reference, `npm run build:all`, pre-deploy `npm run engine:migrate` (**001 + 002 + 003**), `npm start` and `/api/health`. The existing Railway app is a **new service** that ignores deprecated `railway.json`; the reviewed `.railway/railway.ts` IaC file is the intended source for the private database, build/pre-deploy/start/health settings and closed origin. Plan and apply it separately from GitHub pushes, then verify actual deployment settings. Legacy config-as-code overrides dashboard settings until 1 December 2026; see [Railway IaC guidance](https://docs.railway.com/infrastructure-as-code).

For a **domainless private service**, use the closed HTTPS `APP_ORIGIN` placeholder in the setup checklist: the adult engine can start and be inspected through authorised Railway SSH, but **browser registration/login is deliberately unavailable**. Do not describe it as a live tester portal. Give adult testers browser access only after reviewing a private, same-origin HTTPS ingress with no public bypass; then change `APP_ORIGIN` to the exact approved origin, issue verified-adult invitations out of band and repeat the full negative/positive smoke tests. A randomly generated Railway domain is **public exposure, not privacy**. Never enable minor accounts or guardian evidence collection from a flag.

Current Railway guidance: [PostgreSQL](https://docs.railway.com/databases/postgresql), [pre-deploy](https://docs.railway.com/deployments/pre-deploy-command), [healthchecks](https://docs.railway.com/deployments/healthchecks), [IaC](https://docs.railway.com/infrastructure-as-code) and [CLI SSH](https://docs.railway.com/cli/ssh). The existing app auto-deployed GitHub `main`, but the private database and adult engine have **not** been configured or enabled yet.

## Staged next development, not available today

1. Get qualified editorial, safeguarding and accessibility review of the 44-course candidate, the 18 supplements, 23 proposed tool placements, age-equivalent lessons, hidden assessment bank and rubric/appeal policies. Source the official GES/Cambridge/Oxford outcome codes/editions; inspect evidence and approve mappings individually before showing a verified badge.
2. Add HTML/CSS/JS, Python and SQL sandbox vertical slices with an isolated preview origin and resource-limited, no-network worker/runner for user code. Keep authoritative checks server-side on immutable revisions. Do **not** evaluate untrusted code in Fastify or production PostgreSQL. Add data limits, security tests and a keyboard/screen-reader fallback first.
3. Then add design, wireframe, spreadsheet, game and virtual robotics/circuits editors with safe fictional data and distinct graded/free modes. Stage 5 wireframing is proposed for Course 24; the course placement needs editorial approval.
4. Separately implement verified identity/guardian consent, school RBAC/isolation, moderation, retention/deletion, uploads/scan, recovery/MFA, backup restore and audited release migrations **before any minors, schools, public credentials or real billing**.
