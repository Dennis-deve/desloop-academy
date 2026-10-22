# One required 44-course pathway — draft, not an approved syllabus

**Status, 22 October 2026:** `src/curriculum/master.json` is the **one ordered draft-1 source** (44 courses, nine stages, 176 module/lesson outlines). The local FND-01 read-only release projects it through `scripts/build_public_catalog.py` into **metadata only** (`public-catalog.json`), excluding checks, correct options, detailed outcomes and module focus. The public guide does not enrol learners, expose an exam bank or award credit. The earlier browser-only learner/teacher role workspaces are **retired from the runtime**, preserved only in source/Git history and never an authority for progress. The separately gated real adult PostgreSQL pilot remains internal and unpublished. See [release feature evidence](FEATURE_REGISTER.md).

The [Word curriculum reference](../Desloop_Academy_Master_Curriculum.docx) is an editable/exported view of draft-1, **not** a competing syllabus or accreditation. Regenerate with `python3 scripts/export_curriculum.py` after reviewed edits. The owner's Master Curriculum PDF and Global Alignment Strategy PDF informed a separately **unpublished** candidate `src/curriculum/candidates/master-draft-2.json`; [page-cited reconciliation](BLUEPRINT_RECONCILIATION.md) explains its 18 proposed lesson supplements, 23 tool placements and 34 strategy tag hints. Rebuild it with `python3 scripts/build_blueprint_candidate.py`. GES/Cambridge/Oxford hints remain proposals, **not** endorsement or approved mappings. Draft-1 identities/completions do not auto-transfer to draft-2.

| Stage | Courses | Draft focus |
|---|---|---|
| 01 | 01–06 | Digital foundations |
| 02 | 07–11 | Computational thinking |
| 03 | 12–15 | Creative digital production |
| 04 | 16–21 | Web foundations |
| 05 | 22–27 | Programming and software development |
| 06 | 28–32 | Data and AI |
| 07 | 33–37 | Networks, cybersecurity and cloud |
| 08 | 38–40 | Interactive technology |
| 09 | 41–44 | Career and integrated capstone |

**Invariant:** every learner follows Course 01 → 44. Four example/scaffolding bands—ages 6–8, 9–12, 13–17, 18+—do not change prerequisite order or waive outcomes. A visitor opening Course 30's *outline* does not gain access to Course 30's lessons. An age-adaptation note is **not** age verification or permission for a child to register; all child account/data/learning gates remain DB-enforced disabled. Enrichment/remediation stays within the current course. No child identity, public project, guardian proof or community post is collected.

## Genuine adult/internal learning gates (unpublished drafts)

- **Draft-1 `/pilot`:** operator invitation creates a self-attested adult learner/reviewer account in `pilot.*` PostgreSQL, not a browser-selected role. Four ordered lesson checks, a server-scored five-item quiz (default **at least four correct, ≥80%**, **all** critical safety items), privacy-attested text project, operator-assigned reviewer, and rubric project/overall **≥70%**, safety **≥70%** and explicit human approval are required. Server transactions persist versioned completion and unlock only Course N+1. Failure/revision remains in Course N; direct links, browser scores or a stage filter cannot grant passage. Assessments and rubrics are illustrative, not independently validated; the source draft-1 material is **not** an official question bank.
- **Additive draft-2 `/pilot/engine`:** separately migrated, acknowledged and operator-enrolled `learning.*` candidate, with release/policy hashes and seven server-maintained `LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `NEEDS_REVISION`, `FAILED_REMEDIATION`, `COMPLETED` module/course labels. The guided declarative Course 08 visual activity supplies independently checked evidence for its one required lesson. Private studio free practice is saved but **never graded** toward required progression. No arbitrary JS/Python/SQL runner is live; no preview, prior draft-1 credit or proposed standards tag overrides a gate. See [engine runbook](LEARNING_ENGINE_RUNBOOK.md).
- **Only in source history:** `src/curriculum/progression.ts` and local `state.ts` modelled a browser preview; past demo review role switches and local completions had **no server authority**. They are not imported into the new release. Draft answers persist in restricted source for internal scoring, not the public JS/static assets. The postbuild guard scans for known answer text/legacy modules; subject-matter experts must still author a protected reviewed bank for any official assessment.

## Publication and child-release prerequisites

Subject experts must replace templated teaching material, validate question accuracy/distractors and critical safety items, test actual teaching time and accessible alternatives, and approve stage/age adaptation without implying accreditation. Establish immutable published content/policy versions, rubric anchors, approved accommodation/retake/prior-learning/appeal rules, moderation and reviewer training; test with representative teachers/learners and AT users. Official completion needs secure identity, auditable reviewer assignment, a published assessment bank, server/tenant transactions and credible certificates; a private draft pass is not an award. Ghana-qualified legal/privacy/safeguarding review, verified guardian authority/consent, tenant isolation and incident capacity must precede **any** minor or school record. No public, child, school or official programme is approved by these draft source files.
