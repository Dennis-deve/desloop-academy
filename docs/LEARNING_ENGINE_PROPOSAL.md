# Desloop Academy learning engine — design and staged tool roadmap

**Status: proposed architecture with one implemented local adult/internal vertical slice, not a published or Railway-deployed programme.** On 22 October 2026 the owner supplied **`Desloop Academy Master Curriculum.pdf` (5 pp.)** and **`Desloop Global Alignment Strategy.pdf` (3 pp.)**. We reconciled them against the existing unreviewed `draft-1` JSON and built an **unpublished `draft-2-candidate`**, documented in [the source reconciliation](BLUEPRINT_RECONCILIATION.md). All 44 titles and guided-hour figures match the Master PDF; 18 editorial additions and 34 author-strategy tag assignments were proposed without changing the active adult/internal pilot. Since the initial design, the additive migration, seven-state progression, assigned review and **one** bounded guided visual lesson/private studio have been implemented and tested **locally only**; see the [implemented runbook](LEARNING_ENGINE_RUNBOOK.md) and `server/migrations/002_learning_engine.sql` for the actual schema. All other IDE/tool rows below are proposals. Neither source provides official standards outcome codes or editions. This work does not enable minors/schools, verified standards claims, a public credential or arbitrary code execution. Do not award official credit from this draft.

## Design choices and implemented limits

- Keep the **one mandatory course sequence**: Course N+1 is locked until Course N is passed under the correct immutable curriculum release and progression-policy version. School-system choice may badge mappings and choose supplemental examples, **never remove prerequisites or required outcomes**.
- `pilot.users` remains the canonical account table for the existing **adults-only** pilot. New `learning.*` records reference it; do **not** create a second independently writable identity table. Future school/child accounts require verified identities, role grants, guardian consent and tenant isolation in a separate reviewed release.
- The database stores the seven requested state labels, while a server transition service is the **only writer**. A completion row backed by an authorised review and passed assessments is the source of truth for unlocking; no client-supplied state, score, school system or next-course ID can open a course.
- Guided lesson work has immutable versioned criteria and can contribute to progression **only after independent server verification**. Playground work is private and never counts toward course completion. There is **no** cross-scope project import today; a learner must create and save a separate guided revision when its lesson opens.
- The received strategy PDF p. 3 gives exact proposed course tags for `GES_CCP` (8), `CAMBRIDGE_0860` (11), `OXFORD_INTL` (5), plus 10 `VOCATIONAL_PRO` **internal career-focus** tags. It supplies **no official outcome codes or editions**; these are author-strategy hints, not verified compliance or endorsement. Only a separately reviewed, outcome-level mapping can earn a displayed external alignment badge. Do not infer course tags from broad stage headings on p. 2.

## PostgreSQL schema: design summary and illustrative sketch

The **implemented** additive SQL is `server/migrations/002_learning_engine.sql`. It has been applied and re-run only on local disposable PostgreSQL, **not Railway**. `pilot.users`, `pilot.sessions` and existing `pilot.*` attempts/assignments/audits remain the old pilot's source of truth. The new `learning.*` enrolment is explicit and does **not** backfill old completions; any future equivalence/transfer needs a separately approved and audited migration. The table below is a design summary and the SQL snippet later is **illustrative, not a copy of the working migration**; use the actual file and [runbook](LEARNING_ENGINE_RUNBOOK.md), not the snippet, for installation. Most ID records use UUID and timestamps use `timestamptz`, with numeric identity keys for ordered attempts/events.

| Table                                                                     | Essential fields / constraints                                                                                                              | Purpose                                                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing `pilot.users`                                                    | `id`, hashed credential, server-issued role, active/disabled                                                                                | Account FK for adult pilot only. Future institutional/child identity is a separate release gate.                                             |
| `learning.catalog_releases` + `enrollments`                               | unique release `version`, `policy_version`, content SHA-256, `internal_draft/published`; each adult enrolment pins an active release/policy | Immutable content/policy boundary; a reviewed migration is required to switch a learner's release.                                           |
| `learning.courses` + `course_content`                                     | stable course ID, unique sequence number 1–44; release-specific content FK and title                                                        | One ordered pathway, independent of framework mappings.                                                                                      |
| `learning.modules` + `lessons`                                            | release/course parent, ordered unique position; lesson `tool_kind` and assessment-spec reference                                            | Required module/lesson order; server chooses the tool from the current approved content release.                                             |
| `learning.assessment_specs`                                               | release/lesson FK, evaluator version, private criteria/answer key, critical-safety and human-review flags                                   | Immutable, **server-only** scoring definitions; learner API receives prompt, not solutions.                                                  |
| `learning.strategy_tags`, `strategy_course_tags`                          | source-PDF tag, category, source hash/page, course, draft/review status                                                                     | Import the 34 exact strategy hints as proposals. `VOCATIONAL_PRO` is internal, **never** a fourth official external standard.                |
| `learning.standard_frameworks`, `standard_outcomes`, `alignment_mappings` | independently sourced framework + edition + official outcome code; course/module evidence, status, reviewer                                 | Separate, auditable outcome-level GES/Cambridge/Oxford crosswalk **after official verification**; strategy hints alone do not create badges. |
| `learning.course_progress`, `module_progress`                             | learner + release + course/module PK; `progress_state`, revision, policy version, timestamps                                                | Server-maintained state projections; at most one nonterminal course per learner **per release**, with only the pinned release writable.      |
| `learning.sandbox_projects`, `sandbox_revisions`                          | owner, `GUIDED/PLAYGROUND`, tool type, nullable lesson FK, private visibility; immutable revision/hash and bounded bytes                    | Save work without mixing free practice with graded evidence; revisions, not mutable blobs, are assessed.                                     |
| `learning.sandbox_runs`                                                   | project revision, spec/evaluator version, result, source and server verification                                                            | Immediate feedback is not authoritative; only trusted grader output can satisfy a lesson.                                                    |
| `learning.review_assignments`, `review_decisions`                         | assignment to active reviewer, revision FK, decision, rubric, feedback, safety                                                              | Explicit human review for subjective/safety-sensitive work. No self-review or browser assignment.                                            |
| `learning.course_completions`, `progress_events`                          | learner/course/release/policy, approved review FK; append-only event and idempotency key                                                    | Durable pass evidence, audit trail and atomic Course N+1 unlock.                                                                             |

**Illustrative DDL for the critical shape** (NOT the runnable migration: the real `002_learning_engine.sql` has additional FKs/limits/immutability triggers and the local adapter; production-granular database grants, RLS, backfill, rollback and independent audit controls are still missing):

```sql
CREATE SCHEMA IF NOT EXISTS learning;
CREATE TYPE learning.progress_state AS ENUM (
  'LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW',
  'NEEDS_REVISION', 'FAILED_REMEDIATION', 'COMPLETED'
);
CREATE TYPE learning.project_scope AS ENUM ('GUIDED', 'PLAYGROUND');
CREATE TYPE learning.tool_kind AS ENUM (
  'VISUAL', 'WEB', 'JAVASCRIPT', 'PYTHON', 'SQL', 'GAME_2D',
  'ROBOTICS', 'WIREFRAME', 'SPREADSHEET', 'DESIGN'
);

CREATE TABLE learning.catalog_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  policy_version text NOT NULL,
  content_sha256 char(64) NOT NULL,
  status text NOT NULL CHECK (status IN ('internal_draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, policy_version)
);
CREATE TABLE learning.enrollments (
  learner_id uuid PRIMARY KEY REFERENCES pilot.users(id),
  active_release_id uuid NOT NULL,
  pinned_policy_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (active_release_id, pinned_policy_version)
    REFERENCES learning.catalog_releases(id, policy_version)
);
CREATE TABLE learning.courses (
  id text PRIMARY KEY,
  sequence_no integer NOT NULL UNIQUE CHECK (sequence_no BETWEEN 1 AND 44)
);
CREATE TABLE learning.course_content (
  release_id uuid NOT NULL REFERENCES learning.catalog_releases(id),
  course_id text NOT NULL REFERENCES learning.courses(id),
  title text NOT NULL,
  stage_no integer NOT NULL CHECK (stage_no BETWEEN 1 AND 9),
  PRIMARY KEY (release_id, course_id)
);
CREATE TABLE learning.modules (
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  id text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  title text NOT NULL,
  PRIMARY KEY (release_id, course_id, id),
  UNIQUE (release_id, course_id, ordinal),
  FOREIGN KEY (release_id, course_id)
    REFERENCES learning.course_content(release_id, course_id)
);
CREATE TABLE learning.lessons (
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  module_id text NOT NULL,
  id text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  tool_kind learning.tool_kind NOT NULL,
  PRIMARY KEY (release_id, course_id, module_id, id),
  UNIQUE (release_id, course_id, module_id, ordinal),
  UNIQUE (release_id, course_id, module_id, id, tool_kind),
  FOREIGN KEY (release_id, course_id, module_id)
    REFERENCES learning.modules(release_id, course_id, id)
);
-- Author's proposed strategy tags: not official standard/outcome mappings.
CREATE TABLE learning.strategy_tags (
  code text PRIMARY KEY CHECK (code IN (
    'GES_CCP','CAMBRIDGE_0860','OXFORD_INTL','VOCATIONAL_PRO'
  )),
  kind text NOT NULL CHECK (kind IN ('EXTERNAL_HINT','INTERNAL_FOCUS')),
  label text NOT NULL,
  CHECK ((code = 'VOCATIONAL_PRO') = (kind = 'INTERNAL_FOCUS'))
);
CREATE TABLE learning.strategy_course_tags (
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  tag_code text NOT NULL REFERENCES learning.strategy_tags(code),
  source_sha256 char(64) NOT NULL,
  source_page integer NOT NULL CHECK (source_page > 0),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','reviewed','rejected')),
  reviewed_by uuid REFERENCES pilot.users(id),
  reviewed_at timestamptz,
  PRIMARY KEY (release_id, course_id, tag_code, source_sha256),
  FOREIGN KEY (release_id, course_id)
    REFERENCES learning.course_content(release_id, course_id),
  CHECK (
    (status = 'proposed' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('reviewed','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);
CREATE TABLE learning.standard_frameworks (
  code text NOT NULL CHECK (code IN ('GES_CCP','CAMBRIDGE_0860','OXFORD_INTL')),
  edition text NOT NULL,
  source_reference text NOT NULL,
  PRIMARY KEY (code, edition)
);
CREATE TABLE learning.standard_outcomes (
  framework_code text NOT NULL,
  edition text NOT NULL,
  outcome_code text NOT NULL,
  title text NOT NULL,
  source_reference text NOT NULL,
  PRIMARY KEY (framework_code, edition, outcome_code),
  FOREIGN KEY (framework_code, edition)
    REFERENCES learning.standard_frameworks(code, edition)
);
CREATE TABLE learning.alignment_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  module_id text,
  framework_code text NOT NULL,
  edition text NOT NULL,
  outcome_code text NOT NULL,
  evidence text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','verified','rejected')),
  reviewed_by uuid REFERENCES pilot.users(id),
  reviewed_at timestamptz,
  FOREIGN KEY (release_id, course_id)
    REFERENCES learning.course_content(release_id, course_id),
  FOREIGN KEY (release_id, course_id, module_id)
    REFERENCES learning.modules(release_id, course_id, id),
  FOREIGN KEY (framework_code, edition, outcome_code)
    REFERENCES learning.standard_outcomes(framework_code, edition, outcome_code),
  CHECK (
    (status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('verified','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);
CREATE INDEX alignment_by_standard
  ON learning.alignment_mappings(framework_code, edition, outcome_code, status);

CREATE TABLE learning.course_progress (
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  policy_version text NOT NULL,
  state learning.progress_state NOT NULL DEFAULT 'LOCKED',
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, release_id, course_id),
  FOREIGN KEY (release_id, course_id)
    REFERENCES learning.course_content(release_id, course_id)
);
CREATE UNIQUE INDEX one_open_required_course_per_release
  ON learning.course_progress (learner_id, release_id)
  WHERE state IN (
    'AVAILABLE','IN_PROGRESS','SUBMITTED_FOR_REVIEW',
    'NEEDS_REVISION','FAILED_REMEDIATION'
  );
CREATE TABLE learning.module_progress (
  learner_id uuid NOT NULL,
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  module_id text NOT NULL,
  state learning.progress_state NOT NULL DEFAULT 'LOCKED',
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, release_id, course_id, module_id),
  FOREIGN KEY (learner_id, release_id, course_id)
    REFERENCES learning.course_progress(learner_id, release_id, course_id),
  FOREIGN KEY (release_id, course_id, module_id)
    REFERENCES learning.modules(release_id, course_id, id)
);
CREATE UNIQUE INDEX one_open_required_module_per_course
  ON learning.module_progress (learner_id, release_id, course_id)
  WHERE state IN (
    'AVAILABLE','IN_PROGRESS','SUBMITTED_FOR_REVIEW',
    'NEEDS_REVISION','FAILED_REMEDIATION'
  );

CREATE TABLE learning.sandbox_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES pilot.users(id),
  scope learning.project_scope NOT NULL,
  tool_kind learning.tool_kind NOT NULL,
  release_id uuid,
  course_id text,
  module_id text,
  lesson_id text,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility = 'private'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, scope),
  CHECK (
    (scope = 'GUIDED' AND release_id IS NOT NULL AND course_id IS NOT NULL
       AND module_id IS NOT NULL AND lesson_id IS NOT NULL)
    OR (scope = 'PLAYGROUND' AND release_id IS NULL AND course_id IS NULL
       AND module_id IS NULL AND lesson_id IS NULL)
  ),
  FOREIGN KEY (release_id, course_id, module_id, lesson_id, tool_kind)
    REFERENCES learning.lessons(release_id, course_id, module_id, id, tool_kind)
);
CREATE TABLE learning.sandbox_revisions (
  project_id uuid NOT NULL REFERENCES learning.sandbox_projects(id),
  revision_no integer NOT NULL CHECK (revision_no > 0),
  content jsonb NOT NULL CHECK (octet_length(content::text) <= 262144),
  content_sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, revision_no)
);
-- Additional tables in the final migration: assessment_specs, sandbox_runs,
-- review_assignments/decisions, course_completions, progress_events. The graded
-- run must FK to a GUIDED project + immutable revision and matching spec/version.
```

**Assessment-policy decision (owner, 22 October 2026):** the next proposed release uses **quiz ≥80%, project rubric ≥70%, and all safety-critical checks passed**. This reconciles the Blueprint p. 1 `>` wording with its Course 01 80% and Course 44 minimum 70% gates; the active adult pilot already uses inclusive thresholds and is not changed by this proposal. Thresholds must be stored in a versioned server policy, not accepted from requests.

**Release invariants and gaps beyond DDL:** The local adapter verifies a 44-course ordered release, module/lesson totals and policy/content hash, and pins enrolled adults to an **internal draft** release. It refuses silent pin changes; historical draft-1 progress stays separate and cannot unlock draft-2. The API restricts project reads to their owner and review to an assigned reviewer; the migration rejects UPDATE/DELETE of immutable catalog/revisions/runs/completions/progress events. A database owner is still able to bypass app-level expectations, audit is not independently tamper-proof and granular PostgreSQL application roles/RLS have not been deployed. Future **published** releases need reviewed editorial content, privileged operator/editor workflows, explicit data migration/rollback and restricted DB roles; RLS is defence in depth for later schools, not a substitute for backend authorisation. A `school_system_code` on an adult profile, if ever added, is only a _preference_, not verified school membership.

## Server-authoritative transition contract

```text
LOCKED -> AVAILABLE                 only after prior course's current-release pass
AVAILABLE -> IN_PROGRESS            first accepted guided lesson action
IN_PROGRESS -> FAILED_REMEDIATION   failed automated/critical check; same course
FAILED_REMEDIATION -> IN_PROGRESS   targeted retry in the same course
IN_PROGRESS -> SUBMITTED_FOR_REVIEW all required module checks and quiz pass;
                                    immutable guided evidence submitted
SUBMITTED_FOR_REVIEW -> NEEDS_REVISION  authorised assigned reviewer requests changes
NEEDS_REVISION -> IN_PROGRESS       revise evidence within the same course
SUBMITTED_FOR_REVIEW -> COMPLETED  assigned reviewer approves, all gates rechecked
COMPLETED -> next AVAILABLE        same database transaction; no later-course jump
```

Modules use the same labels but can complete on their own approved checks; **only course completion** can unlock the next course. The existing adult pilot already implements a simpler subset (`locked/current/review/revision/completed`) and server-side 01→44 gating; these new states must be an additive, backfilled, tested migration—not a browser label replacement or a silent change to `pilot` production data.

**Progression-service scaffold:** `server/src/engine/contracts.ts` and `policy.ts` now contain the seven labels, allowed transitions, ordered-course and trusted-run guards, and a review-approval orchestration interface with pure tests. The PostgreSQL repository adapter, migration, executable sandbox runners and API wiring are **not implemented**. The intended command shape is:

```ts
type Command =
  | { type: 'START_LESSON'; learnerId: string; lessonId: string; requestId: string }
  | {
      type: 'SUBMIT_GUIDED_RUN';
      learnerId: string;
      projectId: string;
      revision: number;
      runId: string;
      requestId: string;
    }
  | {
      type: 'REQUEST_REVIEW';
      learnerId: string;
      projectId: string;
      revision: number;
      requestId: string;
    }
  | {
      type: 'DECIDE_REVIEW';
      reviewerId: string;
      assignmentId: string;
      decision: 'APPROVE' | 'REVISE';
      requestId: string;
    };

interface ProgressionEngine {
  execute(
    command: Command,
  ): Promise<{ courseState: string; moduleState?: string; nextCourseId?: string }>;
}
```

1. Authenticate and check adult-only pilot role; load the learner's **server-pinned** immutable release and current lesson/spec. For executable code, create a bounded job referencing an immutable project revision. Run code **outside the DB transaction** in an isolated worker/container; never run untrusted code in Fastify or hold a learner row lock during execution.
2. In a short PostgreSQL transaction, `SELECT ... FOR UPDATE` on the learner/progress row. Recompute the current contiguous pass prefix; reject a direct future-course URL, stale version, wrong lesson/module, wrong owner/scope, reused request ID, and client-supplied grade/status. Verify the trusted run's revision hash, evaluator/spec version and safety gates.
3. Write an immutable attempt/run reference, module/course transition and audit event. An assigned reviewer decision rechecks every prior gate, records completion and changes **exactly Course N+1** to `AVAILABLE` in the same transaction. Unique keys make retries idempotent; errors do not partially unlock.
4. Query APIs derive locked/available states from current-release completions and policy, not cached browser values. Exercise concurrency, replay, version drift, different learners, duplicate reviews, failing safety tests and direct URL tampering in PostgreSQL integration tests.

## In-browser tool stack and execution boundary

Keep the present **React 18 + TypeScript + Vite, Fastify on Node 22, PostgreSQL and Zod** stack. The first **implemented** `VISUAL` slice uses a small custom, accessible declarative block composer instead of installing Blockly; only its `course-08/c08-l2` guided revision can create a trusted graded run. `/pilot/engine/studio` is the actual private `PLAYGROUND` route and has **no progression endpoint**. For future tools, lazy-load per **versioned lesson `tool_kind`** from the server (not a browser-picked stage). The proposed packages below still need licence/security/accessibility review before installation.

| Lesson/workspace tool                                     | Proposed embedded frontend                                                                                                                                                                                                                           | Evaluation and containment                                                                                                                                                                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Early visual coding (Stages 1–2)                          | **Implemented:** custom keyboard-operable `START/SAY/REPEAT/CHOICE` block composer for Course 08, Stage 2 guided lesson and private free practice. **Later option:** Blockly with equivalent keyboard controls; no Scratch compatibility is claimed. | Browser provides a local untrusted story preview; saving a guided revision and explicitly requesting a run produces immediate **server-owned** criteria feedback. Only that bounded evaluator's passing latest revision can satisfy its required lesson. |
| HTML/CSS/JS (Stages 4–5)                                  | **Monaco Editor**, lazy-loaded; preview in a **separate-origin, sandboxed iframe**. Consider a simpler accessible text editor fallback on low-memory devices.                                                                                        | Run JS in a bounded Worker or isolated preview context, kill timeouts, block network/storage and validate DOM/AST/tests. Never use the app's main origin for arbitrary code. Server-owned tests for graded work.                                         |
| Python (Stages 5–6 as blueprint confirms)                 | Monaco + locally served **Pyodide** in a dedicated Worker.                                                                                                                                                                                           | Terminate over-budget workers; disable networking with isolated origin/CSP and supply restricted fixtures. For authoritative passes use a separate ephemeral, resource-limited server runner.                                                            |
| SQL/data (Stage 6)                                        | Monaco + **PGlite** (PostgreSQL-compatible WASM) in a Worker with fictional seeded tables.                                                                                                                                                           | Reset a private in-browser dataset per task, limit statements/time; server re-executes graded read-only queries in a disposable least-privilege database. Never connect browser queries to live learner records.                                         |
| 2D game creation (Stage 8)                                | **Phaser** canvas, constrained sprite/asset library and a web-based logic editor.                                                                                                                                                                    | Isolate game scripts/preview; grade deterministic gameplay tests plus assigned human rubric when needed. Supply a non-canvas description/keyboard test path.                                                                                             |
| Virtual robotics/circuits (Stage 8)                       | **Three.js** / React Three Fiber for optional 3D view, plus an accessible 2D SVG circuit canvas and typed graph/netlist model.                                                                                                                       | Deterministic simulated sensor/motor/circuit rules in a Worker; server verifies netlist and action trace. The simulation is educational, **not a certification of real electrical safety**. No hardware required.                                        |
| UI/UX wireframes (**Course 24, Stage 5, Blueprint p. 4**) | Accessible DOM/SVG canvas with **dnd-kit**-style drag-and-drop plus keyboard move/resize and a semantic layers panel.                                                                                                                                | Validate constraints/annotations, then human-review subjective usability; the proposed `c24-l2` tool placement still needs editorial approval.                                                                                                           |
| Spreadsheet/data grid (Stage 6)                           | Custom accessible React grid with keyboard navigation, CSV import and a small deterministic formula parser in a Worker.                                                                                                                              | Check cells, formulas and derived results against seeded fictional datasets; protect CSV export from formula injection.                                                                                                                                  |
| Graphic design (Stage 3)                                  | **Konva/react-konva** or Fabric for a bounded vector/raster editor; accessible layer list and numeric property controls.                                                                                                                             | Validate dimensions, layers and deliverable structure; use a human reviewer for subjective design. No public upload or publishing workflow in the pilot.                                                                                                 |

**Runner isolation:** Browser Workers/iframes provide responsive previews, **not a trust boundary for official scores**. Serve executable previews on an isolated origin with strict CSP, no application cookies/secrets and no egress; validate `postMessage` payloads and set CPU/time/memory/output limits. For scored code, Fastify submits a job to a separately isolated, ephemeral runner with no database credentials or outbound network, then verifies a signed/attested result and immutable revision hash. Never evaluate untrusted code with `eval`, Node `vm`, an app-server child process, or an unrestricted PostgreSQL connection. Railway can host the API/database, but the security properties of the code runner must be validated separately.

## Implementation status and ordered next work

1. **Locally implemented, not published:** additive 002 migration, independent candidate enrolment (no draft-1 completion backfill), versioned seven-state PostgreSQL progression, strict module/course ordering, server-scored checks, reviewer assignment and one Course 08 guided visual activity with immediate server feedback. A separate private free-practice studio saves revisions without grading; desktop/mobile browser, accessibility-regression, policy and PostgreSQL suites exercise these paths. The current legacy pilot remains operational. This work is a **rehearsal before expert content approval**, not a reviewed public release.
2. **Editorial/standards gates still required:** review all 44 candidate courses, 18 lesson supplements and 23 proposed tool placements; approve safety, accessibility equivalents, secure question banks and rubric anchors. Obtain official GES/Cambridge/Oxford editions and outcome codes _separately_, review evidence-backed crosswalks and only then consider verified badges. The 34 imported course tags remain strategy hints.
3. **Security/operations gates still required:** institute least-privilege DB roles, independent audit retention, explicit data-migration/rollback policy, reviewer training/MFA, accessible recovery, abuse controls, privacy/retention and Railway backup/restore. Test concurrent reviews, release changes, failure recovery, real assistive technologies and manual WCAG criteria before external users. The only current tool is a declarative interpreter; no full Blockly, runnable IDE or code-execution isolation exists yet.
4. **Then** add web/Python/SQL and later games, virtual robotics/circuits, wireframing, spreadsheets and design incrementally, with scoped resource budgets, sandboxed runners, data rights and a keyboard/screen-reader equivalent for each canvas. Never run user code in Fastify or against live accounts.
5. **Do not** open to minors or schools until verified age/guardian policy, isolation, consent, moderation, safeguarding staff and reviewed curriculum/standards mappings exist. No Railway deployment or public credential is implied by this plan.
