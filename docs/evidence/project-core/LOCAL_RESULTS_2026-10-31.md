# STU-CORE-01 — local QA evidence, 31 October 2026

**Environment:** Node 22.23.4, PostgreSQL 17.11, localhost-only synthetic accounts and four **different** disposable PostgreSQL databases. The named project-core DB was `desloop_project_core_disposable_local`; no Railway/Render DB, owner credential, real person, payment, AI provider, vendor editor, public ingress, push or deployment was used. HEAD at start was local-only `8a856ce`; the modified source reported here was **uncommitted** at test time. Current file hashes below bind this observation to a particular workspace state, not to a remote release. A **local WIP commit** was created after these observations, with audit failure explicit in its message; it was not pushed. The test suite resets only its explicit localhost disposable fixture DB.

| Command or procedure | Actual result | Important limitation |
|---|---|---|
| `npm ci --ignore-scripts` under Node 22 | **566 packages installed** with this updated lockfile. | A dependency install is not an audit. |
| `npm run typecheck && npm run lint` | Both passed. | Compiler/linter cannot certify a secure PNG parser or WCAG. |
| `npm test` | **25/25** frontend tests passed. | No project-core editor UI exists. |
| `npm run build:all` | Passed; `verify:release` found 44 metadata-only draft course outlines, 12 chunks and no known simulated workspaces or draft assessment question text. | This is a **local** combined artifact, not the hosted guide. |
| `npm run test:server` with distinct PILOT, ENGINE, AI and PROJECT_CORE disposable loopback DB URLs | **31/31 pass, 0 failed, 0 cancelled, 0 skipped**. Project-core tests exercise real Fastify session/CSRF/Origin/role/owner isolation, create/save/round-trip/history, replay, concurrent CAS, image validation/re-encoding/metadata scrubbing including a >32-KiB upload, quotas, SQL immutability, read-integrity detection after deliberate **test-only** tampering, safeguarding and unchanged course completion. | An initial full run had **5 cancelled AI provider timeout tests** from an existing `AbortSignal.timeout()` unref timer; that run was **not** counted as passing. The test changed to a referenced `AbortController` timer and the full suite was rerun successfully. This does not exercise external browser users. |
| `npm run build:server`, then gated `npm run project-core:migrate` on named disposable loopback DB; repeat with approval flag false | Approved **local** manual CLI verified schema; disabled approval refused. | This does not approve or run migration 005 on Railway. |
| Python course/route checks | `build_public_catalog.py --check`, `generate_render_routes.py --check`, and Python unit suite **9/9** passed. | Draft content is not accredited/reviewed. |
| `npm run build:render-public`, `npm run test:render-public`, `npm run test:render-deploy` | Static public-only source/build isolation passed; local HTTP **1/1** and stubbed release receipt/hook/denial **3/3**. | Stubbed hooks and local artifact are **not** Render deployment or a new hosted SHA. |
| `npm run test:e2e`; `npm run test:e2e:render-public` | Local disabled-API read-only guide browser **24 passed, 4 expected adult opt-in skips**; separate public-only Chromium desktop/mobile **6/6**. | No project-core UI, adult editor journey or manual screen-reader/WCAG 2.2 AA sign-off. |
| `npm audit --audit-level=low` | **FAILS** (exit 1): **15 moderate development-toolchain advisories**, 0 high/critical. Includes the existing ESLint 8/JSX accessibility/transitive minimatch/rimraf/glob chain. | Required CI gate is deliberately kept; **do not** hide it. STU-CORE-01 and current candidate OPS-01 are `FAILED_QA`. |
| `npm audit --omit=dev --audit-level=low` | **0** production advisories (exit 0) after a scoped, locally tested `@fastify/static` → `glob@14.0.3` override. | This does **not** excuse the failing whole-dependency audit; major override needs compatibility/security review. |
| `git diff --check`; internal doc links and atomic ID uniqueness | Passed; eight unique atomic `###` feature IDs at this observation. | Not a CI run or hosted verification. |

**Selected file SHA-256** (run `sha256sum` to reproduce; later source changes require a fresh record):

```
36daf4750ed2408a05ac543c52234f08d9ecd63badc3d2ef60c189168952be05  server/migrations/005_project_core.sql
5a85a6a1a6cc86669d3724bceaa065da39a7318af6ea8c54cd1a4eb8d6e988da  server/src/project-core/contract.ts
226ec53d08db2f49142c072f9d4f0be5ad16760325652f5d9fce0c389367a52a  server/src/project-core/migrate.ts
644400133aa400bef2db9263af6d69071e7b11ba1f2f6b68bcf77ff98a93bab4  server/src/project-core/routes.ts
54500fae0b3eaa8a8b3c067c6990e0631652931f1c40cf3ef150e0765808bd7c  server/src/project-core/store.ts
a94f5c7720260b9a36adf96a30d7ca4b415ce406ab7ed145c47423e78af74539  server/tests/project-core.test.ts
ccde4e1315b69e8408ee4a662b9eb159c98d43ed85607b7c3b8c3fd6a53cb6af  package-lock.json
```

**Next gate at the time of this original checkpoint:** resolve the whole-lockfile audit and compat override, then re-run the complete CI command sequence and independent security/privacy/erasure review. Ask the owner **separately** before any private staging ingress/region/budget/migration. **Later same-date follow-up:** [dependency remediation and new full-suite QA](DEPENDENCY_REMEDIATION_2026-10-31.md) records a zero-finding full audit for a newer local lockfile; the failed result above remains an accurate historical observation and is not the current status. Independent review/owner approval is still pending. [Only authoritative feature status](../../FEATURE_REGISTER.md) · [runbook](../../PROJECT_CORE_RUNBOOK.md) · [test strategy](../../TEST_STRATEGY.md).
