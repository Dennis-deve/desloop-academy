# Required 44-course pathway — draft integration

**Editorial status: unreviewed draft-1 remains active in the app and adult pilot.** The 44 course-level blueprints, 176 module lesson outlines, formative checks, age scaffolds and projects are real frontend data, **not validated teaching scripts or accredited assessment**. [Download the generated Word reference](../Desloop_Academy_Master_Curriculum.docx) for all stages, course outcomes, modules, projects, assessment focus and four age adaptations. The exporter reads the same runtime JSON; it is not a competing syllabus.

**New source-informed candidate, local adult/internal opt-in only:** The owner supplied `Desloop Academy Master Curriculum.pdf` and `Desloop Global Alignment Strategy.pdf` on 22 October 2026. [Read the page-cited source reconciliation](BLUEPRINT_RECONCILIATION.md), [the working-engine runbook](LEARNING_ENGINE_RUNBOOK.md) and [the longer tool-stack proposal](LEARNING_ENGINE_PROPOSAL.md). `src/curriculum/candidates/master-draft-2.json` preserves all 44 course IDs/order/titles/hours and adds 18 editorial proposals, 23 sandbox placement ideas and exactly 34 course–tag strategy hints. Rebuild it with `python3 scripts/build_blueprint_candidate.py`. Its **separately gated** adult pilot rehearsal now has an additive schema and one server-checked guided visual lesson; it is **not** a verified standards alignment, a published release or a replacement for the frozen draft-1 pilot. No draft-1 completions are transferred. Curriculum/safety review remains a publication prerequisite.

## Source and navigation

- `src/curriculum/master.json` is the included runtime source of truth. `scripts/seed_master.py` regenerates it from editorial source rows; `python3 scripts/export_curriculum.py` regenerates the Word document. Keep the JSON and Word export in sync after a reviewed edit.
- `src/curriculum/model.ts` exposes stable `course-01`…`course-44` IDs, stage ranges, lesson IDs, age bands and five draft assessment items per course.
- Public `/courses` shows all 44 in sequence, including locked-course outlines. `/courses/:slug` shows a course overview. Learner `/app/courses`, `/app/learn/:courseId/:lessonId`, and `/app/assess/:courseId` demonstrate course, lesson and assessment gates. Facilitator `/facilitator/pathway-reviews` and classroom teacher `/classroom/pathway-reviews` demonstrate human project review. `/sample-courses`, `/app/samples` and `/app/sample-lesson/*` remain **optional standalone workshops**, with separate progress that never unlocks the required pathway.
- School course assignments are **planning references only**. Assigning Course 20 to a class does not grant an individual access to Course 20. Parent progress is a labelled shared-browser illustration, not a verified child record. Admin/facilitator publication controls for other sample drafts cannot publish these 44 courses.

| Stage | Required courses | Focus                                |
| ----- | ---------------- | ------------------------------------ |
| 01    | 01–06            | Digital foundations                  |
| 02    | 07–11            | Computational thinking               |
| 03    | 12–15            | Creative digital production          |
| 04    | 16–21            | Web foundations                      |
| 05    | 22–27            | Programming and software development |
| 06    | 28–32            | Data and AI                          |
| 07    | 33–37            | Networks, cybersecurity and cloud    |
| 08    | 38–40            | Interactive technology               |
| 09    | 41–44            | Career and capstone                  |

**All learners follow the same order.** Optional enrichment, slower pacing and remediation stay within the current course; no age-specific shortcut removes an essential outcome. Four presentation bands—6–8, 9–12, 13–17 and 18+—change teaching examples, supervised steps, response format and contextual notes. Early learners may use picture cards, simulations, a drawing or a facilitator-recorded dictated response. Browser band choice is **not verified age or guardian consent**. The selected 6–12 preview disables community posts, replies and joining sample circles, but that is only a visible UI boundary, not child protection or an age check. Never require a child to publish identity, join an unmoderated space or use unsafe tools. Adaptations and safety requirements need expert review.

## Local demonstration gate

`src/curriculum/progression.ts` is a pure preview state machine. `src/curriculum/state.ts` defines local typed evidence. The course version is `draft-1`; only a **contiguous prefix** of version-matched valid passes opens the next course. Direct links also check the same reducer. The current course has one lesson available at a time. Changing the teaching band does not change the required order or clear work.

1. Complete all four lesson practice records and their formative checks. A missing/incorrect step keeps the learner in the lesson with a worked example and retry. Dictated/visual explanations may be recorded as text by a facilitator.
2. Take a five-item course check; at least **four of five correct (80%)** and **every safety-critical item correct**. Incorrect items show targeted explanations and lesson links; retries remain in the same course.
3. Describe or facilitator-record the required project and reflection using fictional data, plus a privacy self-check. There is no real file upload or message delivery.
4. In a published service, an authorised reviewer must inspect the artefact and enter a rubric. In this browser-only preview, a facilitator or classroom-teacher demo role may enter scores and feedback. Project rubric and overall preview must each reach **70%**; the reviewer must also pass safety explicitly, with a safety score at least 70. If not, return for revision within the same course.
5. A valid demo review creates a local completion record with course version, scores and reviewer label. Course N+1 becomes available. The terminal capstone uses seven weights: problem 10%, functionality 25%, accessibility/design 15%, technical reasoning 15%, testing/revision 15%, safety/privacy 10%, presentation/reflection 10%. It still requires the quiz and critical safety gates.

Visible states are `locked`, `current`, `review`, `revision`, `completed`. A previous course version mismatch relocks descendants for the preview. Attempts are kept locally; there are no irreversible penalties, leaderboards, public child profiles or payment-based course skips. Current answer options and generic worked examples are **illustrative draft content**, not a secure exam bank. Word-count-like minimums only prevent empty demo form submissions and are **not** valid quality measures; subjective work needs accessible, human-reviewed evidence and rubric anchors.

## Separate adult/internal PostgreSQL pilot

The invitation-only `/pilot` journey is **not** the browser preview above. Its Fastify API, PostgreSQL records and operator-assigned reviewer enforce the same required 01→44 course order, four lesson checks, server-scored five-item quiz (≥80% and all safety-critical checks), project submission, and human-reviewed ≥70% project/overall score with ≥70% safety and explicit sign-off. Transactions write versioned completions and the next-course unlock. Reviewers cannot self-assign, and demo role switching does not affect server grants. The implementation was exercised with a local disposable database and browser E2E; **it has not been deployed on Railway**. The pilot is restricted to self-attested invited **adults/internal reviewers** and still uses unreviewed draft-1 content, publicly bundled draft answer keys, text-only evidence and no official credit. No age verification, school tenancy or child-safe identity exists. See [Architecture](ARCHITECTURE.md) and [Deployment](DEPLOYMENT.md).

### Separate additive draft-2 engine (unpublished adult-only rehearsal)

`server/migrations/002_learning_engine.sql`, `server/src/engine/` and `/pilot/engine` introduce a separately operator-enrolled version-pinned sequence. The original draft-1 pilot above remains operational; neither its work nor any browser-demo work backfills into the new release. Draft-2 records all seven `LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `NEEDS_REVISION`, `FAILED_REMEDIATION` and `COMPLETED` labels for both required modules and courses, with server checks that keep Course N+1 locked until Course N passes its ordered lessons, quiz, critical safety checks and assigned human project review. A required bounded visual-block activity is integrated at `course-08 / c08-l2`; private `/pilot/engine/studio` projects are separate, saved and never graded for the pathway. `GES_CCP`, `CAMBRIDGE_0860` and `OXFORD_INTL` filtering shows **proposed strategy tags**, not verified standards badges; no official outcome mappings have been seeded. See the [runbook](LEARNING_ENGINE_RUNBOOK.md) for exact local/Railway steps and missing tools/safeguards. Railway has not been deployed.

### Non-negotiable production boundary

The browser state, role switcher, service worker, URL guard and `localStorage` **cannot establish official completion, review or unlocking**. Anyone can edit browser data. In production, authenticate the learner and reviewer, verify school/tenant assignment and age/guardian policy, resolve the **published immutable course version**, and enforce the prior completion, lesson practice, quiz, critical safety and rubric checks in a server transaction. Do not accept a client-supplied score, completion flag, role, tenant or next-course ID as truth. Store attempts, submission versions, reviewer identity/assignment, decision reasons, rubric dimensions, timestamps and append-only audit events; make review idempotent, appealable and reversible under policy. Isolate guardian summaries from private notes and raw evidence. Decide published policy for retries, accommodations, prior-learning credit and old-version migrations **before** launch.

Suggested backend records: `pathway_versions`, `course_versions`, `prerequisite_edges` (a checked 01→44 chain), `age_adaptations`, `lesson_attempts`, `practice_evidence`, `quiz_attempts`, `critical_check_results`, `project_submissions`, `review_assignments`, `rubric_scores`, `review_decisions`, `course_completions`, `unlock_events`, and `audit_events`. Bind all to verified learner IDs, course-version IDs, school scope (where applicable) and policy version; never infer access from a URL or static class assignment. A single server workflow should recheck the full gate and append completion/unlock events atomically after an authorised reviewer decision.

## Publication backlog

- Rewrite the templated lesson outlines as subject-expert-authored, accurate and developmentally suitable lessons in each band; test actual teaching time. Add rich worked examples, safe tool choices, lower-band non-device equivalents and assessor guidance.
- Validate question wording, distractors and answers; build alternate question forms and calibration data. Author safety scenarios with trained safeguarding leads rather than relying on generic multiple-choice items.
- Define rubric anchors, accommodations, human-review SLAs, moderation/appeal policy, offline privacy and conflict resolution. Test keyboard, screen-reader, captions, plain language, zoom and non-text response formats with representative learners.
- Secure all child data: age checks, verified consent where required, staff background/process checks, private storage, retention/deletion, escalation, school tenancy, audit and incident response. No unrestricted minor/adult messaging or public identifying portfolios.
- Validate all 44 courses and the capstone with real teachers and learners before changing the editorial status from `draft-1` to an immutable published version. No publication or certification is performed by this project.
