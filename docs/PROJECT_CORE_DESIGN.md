# STU-CORE-01 design: private persistence without an editor

**Scope decision (31 October 2026):** The owner approved a genuine, editor-agnostic **adult-only project-core API** on React/Vite + Fastify + PostgreSQL, locally tested now; separate approval is required for private adult staging. This document describes implemented storage/permissions and **future** UI obligations separately. It is not a Scratch/GDevelop adapter, a Supabase migration or a studio screen.

## Trust and data flow

```text
future approved editor adapter (NONE SELECTED OR IMPLEMENTED)
  → typed JSON document and explicit PNG asset ID manifest (untrusted data)
  → active adult learner session + exact Origin/CSRF + per-route body/rate limits
  → Fastify /api/pilot/project-core/v1 [local+flag only]
  → project-core/{contract,routes,store,migrate}.ts
  → PostgreSQL pilot.users identity → project_core.{projects,revisions,assets,revision_assets}
  ↘ pilot.audit_events (IDs, SHA-256, counts; never raw image/document)

SEPARATE AUTHORITY: learning.* and pilot.course_completions/assessments
  ↑ NO connection from a project-core save, title, document field or asset digest.
PUBLIC: Render static guide → no API/project-core import, identity or write.
```

The `project_core` schema is separate from the course-coupled `learning.sandbox_*` revision mechanism. Primary key of `projects` is a random UUID; `owner_id` references the existing self-attested adult `pilot.users`. Project rows stay private and fixed to their owner; their only legal update increments `latest_revision_no` exactly by one. `(project_id, owner_id)` composite foreign keys on revision/asset/manifest keep project/asset ownership aligned. First revision and project insert atomically under a deferrable `latest_revision` FK. `revisions` and `assets`/manifest rows reject UPDATE/DELETE via triggers; content hashes are verified when reopened. Account row locks serialize quota/idempotency/CAS decisions. The project format tag `JSON_V1` means **bounded JSON data**, not an executable editor format or a rubric.

## Interaction/status contract for a later real client

| State | Required honest design behaviour; **not implemented as a UI** |
|---|---|
| No session/disabled/reviewer | Restrict route, explain that private adult access is unavailable. No redirect implying an account or draft was created. |
| New project (initial rev 1) | Show “saved” only on a server `201`/`200 repeated:true` with an ID/revision/digest; never on a local editor state change. |
| Loading/list/empty | Show owned project summaries only, with meaningful empty state. Protect privacy on shared devices; cache must be private/no-store. |
| Upload/validation | Show PNG-only budget before selection; reject oversized/corrupt/spoofed images, preserve unsent local work and identify next safe step. Explain image metadata is discarded on save. |
| Saving a new revision | Show an in-progress state while the POST is pending, store one idempotency UUID per intent, and confirm the **server-assigned** new revision, never a fabricated timestamp. |
| Uncertain network outcome | Keep local work, re-send the **same** UUID and bytes; a 200 replay verifies the earlier commit, while 201 verifies a new commit. Distinguish “unknown” from “saved”. |
| Stale base (409) | Do not overwrite; load latest and historical revisions and let the owner compare/choose a new save. Do not automatically invent a merge. |
| Quota / bad document / server error | Communicate accurate limit or temporary failure, leave local edits intact, offer a recovery path; no dead “retry” that silently loses work. |
| Reopen older revision | Clearly label historical vs latest number; opening history is read-only until the owner explicitly creates a new revision from a current base. |
| Logout/shared device | Clear in-memory project view, not the owner's server revisions; no localStorage project authority or offline cache until separate privacy/sync design. |

**Future UI accessibility acceptance, not executed:** keyboard-only create/open/save/conflict/asset flow, predictable focus on status/error/navigation, programmatic live status without repeated alert spam, meaningful field error associations, large touch targets, 320px reflow and 200–400% zoom, reduced motion, supported Ghana English plain language, manual NVDA/VoiceOver/TalkBack and representative-device/3G observation. Automated axe alone cannot certify WCAG 2.2 AA. A genuine licensed editor must be independently usable at low RAM; the Phase 2 synthetic V8-heap probe is not proof.

## Rejected implicit equivalences

- A JSON document or PNG is **not** automatically safe for display/execution. Later clients must escape untrusted text, avoid HTML injection, separate preview execution from authenticated origin, consider CSP/service-worker scope, and independently validate vendor format.
- A hash is not a digital signature; a DBA can disable a trigger or edit data. Verified on-read hashes/append-only triggers protect against ordinary bugs, **not** privileged compromise. Restrict runtime DB roles, maintain external audit and restore before real users.
- A project title/asset/revision is **not** evidence of quiz ≥80%, project ≥70%, critical safety or human review. No route writes course completion, class code, assignment, grade or public gallery.
- Account ownership is **not** school/tenant separation. An authorised teacher/classroom feature needs new schema/permissions and a tested cross-school boundary; this slice has neither.
- Local-only feature flagging is **not** remote infrastructure access control. All private-stage ingress, region, cost, backup, privacy, asset policy and legal decisions remain owner gates.

[API/runbook](PROJECT_CORE_RUNBOOK.md) · [only authoritative status register](FEATURE_REGISTER.md) · [architecture](ARCHITECTURE.md) · [design system baseline](DESIGN_SYSTEM.md)
