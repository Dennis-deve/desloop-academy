# Adult project document client — executed local QA, 31 October 2026

**Scope:** STU-CORE-UI-01 is a genuine connected React client for the already local-only adult project-core Fastify/PostgreSQL API. It edits **bounded data-only JSON**, not executable source/block code or a Scratch/GDevelop runtime. No new migration, browser-owned role or credit authority, PNG upload UI, public route, teacher/class, child account, AI or payment was added. The API still defaults **off** on Railway, rejects production/remote or non-disposable DB opt-in and requires manual local 005 installation. This is **not a hosted deployment or live-user test**.

**Source/push boundary:** The owner elected an eventual trusted-machine GitHub `main` push, accepting the known Railway pre-CI auto-deploy risk, rather than granting the agent a write credential. This evidence was recorded **before any observed new remote SHA, CI run or Railway deployment**. A prepared Git bundle is a downloadable source handoff, not proof of a push. The separately hosted read-only Render guide remains observed at older `62cbf7b…` until independently promoted/verified. No private paid stage/public adult ingress is approved.

## Tested source and infrastructure

- Node **22.23.4**, PostgreSQL **17.11** on `127.0.0.1:55439` only; five **distinct newly created disposable** databases. Four isolated regression DBs for PILOT/ENGINE/AI/PROJECT_CORE; fifth `desloop_project_core_disposable_browser_local` for real local adult browser testing. No Railway/Render/prod DB, real person or owner secret was used. PostgreSQL was stopped after checks.
- The fifth DB was migrated with `npm run engine:migrate` (001–003) and **explicitly approved local** `npm run project-core:migrate` (005), with named synthetic operator, `NODE_ENV=test`, `HOST=127.0.0.1`, exact local `APP_ORIGIN`, and the fifth DB URL. The Playwright config refuses a non-loopback/non-`desloop_project_core_disposable_*` DB and starts both API and Vite **bound to localhost**. The Railway migration/flags were not touched.
- `.github/workflows/verify-and-publish.yml` now provisions a **fifth disposable CI browser DB** separately from four regression DBs, runs those CLI migrations with CI-only flags, then runs the real adult browser suite; PR/work/main `verify` still has read-only token and no live provider/deploy credentials. Its `publish_public` job is still manual/`main`-only. Source-level `actionlint` **1.7.12** and YAML parse passed; **not a remote GitHub Actions run**.

## Commands and observed results

| Check | Actual result / boundary |
|---|---|
| `npm run typecheck`; `npm run lint` | Passed on Node 22. The lint script still verifies all 34 JSX accessibility recommended severities and negative a11y/Hook/TS fixtures; no rule waiver. |
| `npm test` | **31/31 passed** (25 earlier frontend cases + 6 new adult-project UI tests). New cases use **explicit stub HTTP** to test disabled 404/nav hiding, reviewer direct URL denial, invalid/oversized JSON, authenticated same-origin CSRF writes, create/save/reopen/history, 409 compare and same-ID/payload uncertain retry. They are not proof of actual server behaviour alone. The **first** whole frontend command failed because Vitest accidentally collected the new opt-in Playwright file; the exclusion was fixed and the **rerun passed 31/31**. Initial type-narrowing/test-fixture failures were corrected before final QA. |
| `npm run test:server` with four different disposable PostgreSQL URLs | **31/31 passed, zero failed/cancelled/skipped**. Existing real server integration covers active learner roles, owner/other learner/reviewer/anonymous denial, true CAS, idempotency, immutable triggers, 005 checksum/hold, validated PNG bytes and no course credit. No new backend permission shortcut was added for the browser. |
| `npm run build:all`; `npm run build:render-public` | Both passed. Combined bundle verified **44 metadata-only draft outlines, 14 chunks, no known fake workspaces or draft question text**; isolated public-only build verified **44 draft outlines and 11 static style/script/font files**, no pilot/AI/private API chunks. The new `/pilot/projects` code remains lazy in the combined adult bundle and is absent from Render's public-only artifact. |
| Python catalogue/route checks, `python3 -m unittest discover -s scripts/tests -v`, `npm run test:render-public`, `npm run test:render-deploy` | Projection/exact routes and **9/9** Python cases, static local HTTP **1/1**, deploy-hook **stub 3/3** passed. No hosted deploy hook was used. |
| `npm audit --audit-level=low`; `npm audit --omit=dev --audit-level=low` | Both **0 vulnerabilities** on the current local lockfile; point-in-time and still required in CI. Independent major-version override/security review remains open. |
| `npm run test:e2e`; `npm run test:e2e:render-public` | Default public desktop/mobile **24 passed / 4 expected adult opt-in skips** with real disabled Fastify API; isolated public-only desktop/mobile **6/6 passed**. These do not test a hosted changed source. |
| `PROJECT_CORE_E2E_DATABASE_URL=<fifth disposable loopback URL> npm run test:e2e:project-core` | **2/2 passed** on actual local Fastify/Vite/PostgreSQL in desktop and mobile Chromium; synthetic invited adults used JSON revisions **1→4**, second-tab 409 and explicit compare/ack, historical reopen, a **real committed POST** with deliberately lost browser response followed by the **same request ID** replay, another account's 404 and zero earned course completion. Axe A/AA-tagged checks on list, detail and conflict passed on tested pages, plus measured **320px** no-horizontal-page-overflow. This is stronger than stub UI checks but **not** manual WCAG 2.2 AA, representative 3G/Ghana-device or real-user verification. |
| `git diff --check` and `actionlint .github/workflows/verify-and-publish.yml` | Passed; source YAML also parsed. GitHub runner and Railway after an actual push remain unobserved. |

**Source SHA-256 for reproducibility (before local commit):**

```text
329bd4b31c729dc0004ae41afcaa08ab483902188486835da597b0dc6275e683  src/features/pilot/project-core/api.ts
5f657fcbd4220b1db1fb3242fb8a9bd2c4d9dca4d23432169bf919db37976cd5  src/features/pilot/project-core/document.ts
2fe03574a22411328ff6d6b660b978bab75179e02ee0a175b713aa9664357a2c  src/features/pilot/project-core/ProjectPages.tsx
4b2b31b69a26908c28ae3b8425ce19658faffefafe3fcc5ab6eff56d569d8b16  src/tests/project-core-client.test.tsx
fbb7cc9df58655be3bf1a7693d07bac2036b6f0934400940ba1c2c02a196ca3a  e2e-project-core/project.spec.ts
2828db7bbbc81127826bce65c116dc8aa525ea2ba40ca1bb5e88f4ed163e5716  playwright.project-core.config.ts
c09d810c5ab056dae8caac58571d880070d6de85bf0e84665afa227798eca801  .github/workflows/verify-and-publish.yml
95434a4ceed45ebef3771795f007c2c4cf823963b7dae88a2ab98e84a65c55b4  package.json
```

**Remaining blocks:** No router-wide SPA-navigation guard for unsent text, no PNG upload/orphan/erasure policy, licensed editor/preview/export, tenant/class, offline/device sync, human usable adult ingress, account recovery or verified age. Independent image/parser/DB privilege/backup/retention/privacy/security and manual screen-reader/zoom/keyboard/representative Ghana low-RAM/3G tests have **not** run. The owner must separately approve legal/region/budget/identity/ingress/staging before real personal data or a private deployment; the source push choice does **not** approve those gates. STU-CORE-UI-01 remains `IMPLEMENTED_PENDING_TESTS`; STU-01 remains `BLOCKED_DECISION`.
