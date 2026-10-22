# Received-source reconciliation — Desloop Academy

**Prepared 22 October 2026. Editorial status: source-informed candidate, not a published curriculum or verified standards alignment.**

| Supplied source                         | Pages | SHA-256                                                            | What it supplies                                                                                           |
| --------------------------------------- | ----: | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `Desloop Academy Master Curriculum.pdf` |     5 | `af6a8806d26edcf25a470f09129debcadfbba9bdd8f93710a6c13fbae48ac76d` | 44-course sequence, guided hours, projects/gates, four teaching bands, nine-part course pattern (pp. 1–5). |
| `Desloop Global Alignment Strategy.pdf` |     3 | `b814466bf85d5af5ad2a4884c4bb85fcd0738a851936b751b8c55a38be474201` | Strategy-level integration directives and explicit course-number tag lists (pp. 1–3).                      |

## What matched the existing curriculum

The existing `src/curriculum/master.json` `draft-1` contains **44/44 matching course titles and guided-hour figures**, in exactly the PDF's 01–44 sequence (checked against pp. 2–5). The extracted, source-hashed `src/curriculum/candidates/blueprint-course-index.json` records each PDF title/hour/page; the candidate builder refuses changed baseline titles or hours. Stage ranges, broad projects, age bands, four lesson outlines per course and most safety boundaries are already present. The attachments do **not** authorize an extra track, skipped prerequisite, credential, public child portfolio or school enrolment. The PDF is an operating blueprint, not a complete reviewed lesson-by-lesson script.

The 44-course baseline and active adult pilot are **unchanged**. `src/curriculum/candidates/master-draft-2.json` is a reproducible _unpublished candidate_ built by `python3 scripts/build_blueprint_candidate.py` from `draft-1` and `src/curriculum/candidates/blueprint-additions.json`. It preserves every course ID, title, hour, required project, existing lesson/check, and the 01→44 order. It adds 18 source-cited editorial lesson additions and 23 explicitly **engineering-proposed** in-app tool placements. The original draft-1 API and public course map still use `master.json`. Only the explicitly enabled, separately enrolled **adult/internal draft-2 engine** loads this candidate on the server; its supplements still need curriculum, accessibility and safeguarding review before publication or use as secure assessment items.

### Concrete missing/under-specified teaching topics added to the candidate

| Course and lesson        | Addition (strategy PDF page)                                                                                                            | Evidence suggested—not a published exam                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 09 `c09-l1/l4`           | AND/OR/NOT truth tables, simple logic-gate/binary signal illustrations; combined Boolean trace (pp. 1–2).                               | Predict all cases in a fictional two-input decision; explain one result.               |
| 10 `c10-l2`              | Reproducible syntax-versus-logic bug report (p. 2).                                                                                     | Another learner can reproduce the fictional defect.                                    |
| 11 `c11-l1`              | Explicit supervised introductory Python connection to the existing visual/pseudocode outcome (p. 1).                                    | Greeting or accessible equivalent trace and variable explanation.                      |
| 16–17 `c16-l3`, `c17-l2` | Network connectivity/client–server boundary and HTML hyperlink semantics (pp. 1–2).                                                     | Diagram the request and use a keyboard-operable, clearly labelled local link.          |
| 22 `c22-l2/l3`           | String/Integer/Float/Boolean types; assessed IF/ELIF/ELSE, WHILE/FOR, input/output and bounded loops (pp. 1–2).                         | Synthetic examples and tests for branches, loop paths and bad input.                   |
| 28 `c28-l2`              | Synthetic training-data imbalance in a data-quality discussion (p. 1).                                                                  | Explain a possible limitation; do not claim a real AI model was trained.               |
| 30 `c30-l2/l4`           | Explicit primary/foreign keys and safe frontend→API→database separation (p. 1).                                                         | Mark keys and explain why the browser never receives a DB credential.                  |
| 31 `c31-l1/l4`           | ML/training-example limitations and a human check for bias (p. 1).                                                                      | Document a limitation and privacy-respecting verification.                             |
| 33 `c33-l3`              | Simulated network equipment/configuration diagram (p. 1).                                                                               | Explain a non-invasive connectivity check.                                             |
| 34 `c34-l1/l2/l3`        | Brute-force _recognition_ alongside phishing/malware, defensive authentication, high-level encryption, backup vs redundancy (pp. 1, 3). | Correct protective choices on fictional scenarios; **no attacks or real credentials**. |
| 39 `c39-l3`              | Reuse logic-gate concepts in a **virtual** sensor/control circuit (p. 1).                                                               | Four-case simulated sensor trace and safe failure state.                               |

The placement of a directive into a _specific lesson_ and all lesson activity/evidence wording are **editorial proposals** based on the supplied strategy; neither PDF provides all those lesson IDs or authoritative rubric keys. No optional text in the candidate silently changes the active assessment.

### Exact strategy tagging table, not official outcome mappings

The strategy PDF p. 3 explicitly lists these **34 course–tag assignments across 26 distinct courses**:

| Code             | Source course numbers                      | Classification                                                         |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `GES_CCP`        | 07, 11, 17, 22, 30, 31, 33, 34             | External-framework **hint**.                                           |
| `CAMBRIDGE_0860` | 07, 08, 09, 10, 11, 17, 18, 28, 29, 31, 34 | External-framework **hint**.                                           |
| `OXFORD_INTL`    | 12, 13, 22, 28, 29                         | External-framework **hint**.                                           |
| `VOCATIONAL_PRO` | 21, 24, 25, 27, 36, 37, 41, 42, 43, 44     | **Internal Desloop career-focus tag**, not a fourth external standard. |

Stage-level “aligned” headings on p. 2 are _not_ course-by-course mappings and cannot override p. 3's explicit lists. The Stage 6 heading on p. 2 has **no content-integration directives beneath it**; only p. 1's high-level data/AI strand and p. 3's course tags are available. The PDFs supply **no official outcome codes, standards editions, clause/page citations to external standards, permission/endorsement, or confirmed school-system equivalences**. The new candidate therefore sets `strategy-proposed`, `displayAsVerifiedAlignment=false`, `officialOutcomeCode=null`, and `edition=null`; it does not create an official alignment badge. A standards specialist must check the official editions and outcome-level evidence before anything is marked verified.

### Progression policy decision and remaining publication gates

Blueprint p. 1 uses **“>80%”** quiz and **“>70%”** project, while Course 01 names **80%**, Course 44 says **minimum 70%**, and the current adult pilot implements **≥80% / ≥70%**. The owner resolved this in this conversation on **22 October 2026**: use **≥80% quiz / ≥70% project** for the proposed next version. Keep the pilot policy as-is and require every safety-critical check to pass. The upstream PDF's p. 1 symbols remain a documented editorial inconsistency. With five quiz questions, literal >80% would have meant 5/5; that is **not** the chosen policy.

Blueprint p. 1 also describes nine phases for each course. Four stored lessons plus a generic check do not yet supply nine independently authored, reviewed phases; the candidate records the nine-phase target rather than falsely asserting the app already implements it. The candidate retains existing answer keys in source alongside the public draft-1 demo and **must not be used as secure official assessment**. A separate **unpublished** PostgreSQL engine now exercises version-pinned progression and one bounded visual lesson with private free practice in local tests; it does **not** transfer old pilot completions or confer official credit. Next: expert-edit real demonstrations, independent practice, assessment variants/rubrics, accessibility equivalents and safety scenarios; review the tag crosswalk against official standards; issue a reviewed immutable publication release only after sign-off, and decide any adult-data migration explicitly. Other IDEs/tools and proper runner isolation remain staged. Minors/schools remain out of scope until consent and safeguarding infrastructure exists.

## Rebuild and verify

```bash
cd /home/user/desloop-academy
python3 scripts/build_blueprint_candidate.py
python3 -m unittest discover -s scripts/tests -v
npm run typecheck && npm run lint && npm run test && npm run test:server
```

The additive engine and migration have been applied **only to disposable local PostgreSQL databases** and exercised in server/browser tests. This working draft-2 source has **not been committed or pushed** to GitHub or deployed to Railway. The previously pushed `main` at `c71307628dd3e1fca2f3cd057be6c6671c62879c` contains only the earlier pilot; use the new source archive and [operator runbook](LEARNING_ENGINE_RUNBOOK.md) for this version.
