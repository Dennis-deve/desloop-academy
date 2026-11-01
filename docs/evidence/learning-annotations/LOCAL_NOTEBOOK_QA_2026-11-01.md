# LN-01 — local feature evidence and limits

**Date:** 1 November 2026 UTC. **Work branch:** `work/real-learning-notebook`, based on the unpushed D25/D26 motion commit `a926951…`. This is an **original server-backed learning feature in local source**, not public enrolment, a synthetic-stage rollout, a Railway deployment, a GitHub push/CI result or a completed M04 area. Only disposable, explicitly named local PostgreSQL 17 databases owned by a newly created local test role were used. No real users, Neon/Render/Railway migration, AI/payment call or outside course import was made.

## Implemented contract

- Migration `006_learning_annotations.sql` is additive and **separate** from legacy pilot/engine bootstrap. Owner/lesson/course/version keyed, at-most-4,000-character plain-text note, bookmark, revision/timestamp. An opt-in `LEARNING_ANNOTATIONS_ENABLED` flag defaults **off**; the private API refuses enabled startup without the migration and read grant, and the new routes/UI are absent when disabled. The only supplied migration CLI path is explicitly approved **disposable loopback**; no remote migration target has been approved.
- Only a server-session learner can read or write their own record on a server-unlocked course; strict body validation and Origin+CSRF guard writes. PostgreSQL insert-if-new/update-only-if-exact-revision yields 409 on concurrent stale writes; it cannot grant course credit. Queries return private no-store; audit and request logging exclude learner text.
- The actual adult course page offers explicit save, course-version match, saved/unsaved distinction, bookmark and previous notes, two-tab conflict comparison/acknowledgement and an honest uncertain-network state. It warns unsaved text may be lost on navigation; router-wide SPA navigation recovery is **not** implemented. The shared motion system and responsive/public reduced-motion protections from D25/D26 remain in the branch. No third-party platform API or licensed editor is embedded.

## Executed checks (not remote CI)

| Check | Observed result |
|---|---|
| `npm run typecheck`, `npm run lint` on Node 22.23.4 | Passed; 34-rule accessibility lint contract executed. |
| `npx tsx --test server/tests/learning-annotations.test.ts` with dedicated disposable loopback PostgreSQL | **2/2** (including the private schema/permission/CSRF/Origin/owner/version/locked-course/persistence/409/parallel-write/no-credit cases). No live provider tests. |
| `npm run test:server` with **five distinct** disposable test databases (pilot, engine, AI, project core, annotations) | **42/42**, 0 skips. Each database was private local PostgreSQL, not Neon/Railway. |
| `npm test -- --maxWorkers=2` | **45/45**, 0 skips. Four new notebook component cases include unsaved switching, explicit compare and ambiguous network. The first run performed concurrently with CPU-intensive lint/typecheck failed an unrelated existing closed-route UI assertion once (44/45); its isolated retry passed, then the capped-worker full run passed. Do not misstate the first run as green. |
| `npm run test:e2e:pilot-dashboard` on a **new, separate** local PostgreSQL browser database | **2/2** actual desktop/mobile Chromium with server-backed account, note write/reload/bookmark, two-tab conflict and explicit comparison, no credit, axe-tagged A/AA checks and existing motion/learning review. Browser fixture accounts use `.invalid` test addresses; they are not public enrolments. |
| `npm run build:all`, `npm run build:render-public`; `npm run test:render-public`/`test:render-deploy` | Passed; isolated metadata-only public artifact had no private chunk; deploy tests are **stubs**, not a real Render deployment. |
| `npm run test:e2e` / `test:e2e:render-public` / `test:learning-loop-review` | **24 passed / 4 expected skips**, **10/10**, and **8/8**, respectively. |
| `npm audit --audit-level=low` and `--omit=dev` | Each reported **0** at run time; not an independent security audit. |
| `git diff --check` | Passed before work-branch commit. |

## Still open before an approved real release

A production identity/guardian model and DPC/child/transfer approvals; an owner-inspected production DB target, backup/restore, independently reviewed 006 runtime role grants and migration path; consent, retention, erasure and tenant isolation; reviewed lessons/media, manual screen-reader/keyboard and representative Ghana 320px/low-RAM/network testing; in-tab navigation/sign-out unsaved recovery; security/abuse review; actual work-branch GitHub PR/CI; hosted closed-Render QA; public Railway provisioning and signed go/no-go. This slice must remain `IMPLEMENTED_PENDING_TESTS`, and M04 remains `IN_PROGRESS`. See `docs/FEATURE_REGISTER.md` for the only authoritative status. **Cleanup performed:** verified ownership of exactly eight newly created local disposable QA databases, dropped those eight and the newly created local test role, removed the temporary password/test log and stopped local PostgreSQL 17. No existing user, Neon, Render or Railway data was deleted or copied.
