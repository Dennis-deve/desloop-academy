# STU-CORE-01 / STU-CORE-UI-01 / STU-CORE-UI-02: private persistence, data-only client and in-tab recovery

> **D23 design correction (1 November; supersedes D22 copy):** Keep the account-owned JSON-only contract and in-tab recovery. The owner approved **synthetic-only** stage testing on a new publicly addressable Render Free web service with a **separate server Basic gate** before adult session/CSRF, against a **new empty, verified-TLS Neon Free Frankfurt** DB. Railway app/DB reportedly deleted with no backup; old data/credit is not restorable. Separate direct-only approvals for 001–003 bootstrap and 005, plus SQL-created restricted runtime role, are required. This is **not** a private network, editor or hosted/real-user go-live; no Render/Neon instance exists. [Current D23-corrected runbook](RENDER_NEON_SYNTHETIC_STAGE_D22_2026-11-01.md).

**Historical scope decision (31 October 2026):** The owner approved a genuine, editor-agnostic **adult-only project-core API** on React/Vite + Fastify + PostgreSQL, then selected a real connected project document client. API/UI-01 source reached GitHub `main` `5641102…` with successful CI; GitHub reports a Railway deploy, **not** an inspected/approved private runtime. The later local-only UI-02 adds per-account **in-tab unsaved edit recovery** after an authorised server GET. Separate approval is required for private adult staging. The JSON_V1 client only changes **data-only JSON**; it is not a Scratch/GDevelop adapter, executable code/block editor, Supabase migration, preview, offline backup or finished studio.

## Trust and data flow

```text
local adult-only JSON document client (real, untrusted data, no vendor adapter)
  ↳ PilotLayout account-bound, in-memory unsaved UI text; never server authority.
     Same-tab return → authenticated project GET → compare server revision → optionally restore.
  → bounded data-only JSON document; preserve existing PNG asset ID manifest on save
  → active adult learner session + exact Origin/CSRF + per-route body/rate limits
  → Fastify /api/pilot/project-core/v1 [disposable local OR D22 gated synthetic Render+Neon]
  → project-core/{contract,routes,store,migrate}.ts
  → PostgreSQL pilot.users identity → project_core.{projects,revisions,assets,revision_assets}
  ↘ pilot.audit_events (IDs, SHA-256, counts; never raw image/document)

SEPARATE AUTHORITY: learning.* and pilot.course_completions/assessments
  ↑ NO connection from a project-core save, title, document field or asset digest.
PUBLIC: Render static guide → no API/project-core import, identity or write.
FUTURE: approved licensed editor adapter, preview origin, upload lifecycle and export
  → NOT SELECTED OR IMPLEMENTED by the JSON client.
```

The `project_core` schema is separate from the course-coupled `learning.sandbox_*` revision mechanism. Primary key of `projects` is a random UUID; `owner_id` references the existing self-attested adult `pilot.users`. Project rows stay private and fixed to their owner; their only legal update increments `latest_revision_no` exactly by one. `(project_id, owner_id)` composite foreign keys on revision/asset/manifest keep project/asset ownership aligned. First revision and project insert atomically under a deferrable `latest_revision` FK. `revisions` and `assets`/manifest rows reject UPDATE/DELETE via triggers; content hashes are verified when reopened. Account row locks serialize quota/idempotency/CAS decisions. The project format tag `JSON_V1` means **bounded JSON data**, not an executable editor format or a rubric.

## Interaction/status contract — local JSON client versus future editor

| State | Implemented local JSON client behaviour / remaining limit |
|---|---|
| No session/disabled/reviewer | Restrict route, explain that private adult access is unavailable. No redirect implying an account or draft was created. |
| New project (initial rev 1) | Show “saved” only on a server `201`/`200 repeated:true` with an ID/revision/digest; never on a local editor state change. |
| Loading/list/empty | Show owned project summaries only, with meaningful empty state. Protect privacy on shared devices; cache must be private/no-store. |
| Upload/validation | **Not implemented in the client.** The server has bounded, normalized PNG intake tested separately. Future asset-management UI must show limits before selection, preserve unsent local work and explain metadata stripping, orphan/erasure policy and human recovery before real uploads. Existing server-attached image IDs are carried forward on JSON save. |
| Saving a new revision | Show an in-progress state while the POST is pending, store one idempotency UUID per intent, and confirm the **server-assigned** new revision, never a fabricated timestamp. |
| Uncertain network outcome | Keep local work, re-send the **same** UUID and bytes; a 200 replay verifies the earlier commit, while 201 verifies a new commit. UI-02 preserves the exact intent across nested in-pilot navigation; it never calls an unknown outcome saved. |
| Unsaved tab recovery | With the adult pilot still mounted, keep an existing document's raw edited text in an account-bound memory map; on return **first GET the server-owned project**. If latest differs, show explicit comparison; if the GET denies access, show no cached text. The new-project create form is not covered. Full reload, sign-out, switching account and leaving the pilot discard it. No durable device storage or router-wide history guard. |
| Stale base (409) | Do not overwrite; load latest and historical revisions and let the owner compare/choose a new save. Do not automatically invent a merge. |
| Quota / bad document / server error | Communicate accurate limit or temporary failure, leave local edits intact, offer a recovery path; no dead “retry” that silently loses work. |
| Reopen older revision | Clearly label historical vs latest number; opening history is read-only until the owner explicitly creates a new revision from a current base. |
| Logout/shared device | Warn and allow cancellation if unsaved text is held; confirmed sign-out/account switch clears the in-memory vault but not server revisions. No localStorage/sessionStorage/IndexedDB project authority or offline cache until separate privacy/sync design. |

**Accessibility evidence and future obligations:** The data-only client has labelled fields, live save/error feedback, keyboard-usable controls, no automatic overwrite, local desktop/mobile Chromium **2/2** with tested axe A/AA-tagged states and a measured 320px reflow without page horizontal scroll. This is **not** manual keyboard/focus or NVDA/VoiceOver/TalkBack and representative Ghana-device/3G/200–400% zoom testing; a router-wide browser-history/programmatic unsaved-navigation guard, new-project form recovery, PNG asset flow and genuine licensed editor/preview remain future work. UI-02's extra long-comparison axe finding was fixed with labelled focusable read-only textareas and tested keyboard Tab order; scripted focus/axe cannot certify manual WCAG 2.2 AA. A genuine editor must be independently usable at low RAM; the Phase 2 synthetic V8-heap probe is not proof.

## Rejected implicit equivalences

- A JSON document or PNG is **not** automatically safe for display/execution. Later clients must escape untrusted text, avoid HTML injection, separate preview execution from authenticated origin, consider CSP/service-worker scope, and independently validate vendor format.
- A hash is not a digital signature; a DBA can disable a trigger or edit data. Verified on-read hashes/append-only triggers protect against ordinary bugs, **not** privileged compromise. Restrict runtime DB roles, maintain external audit and restore before real users.
- A project title/asset/revision is **not** evidence of quiz ≥80%, project ≥70%, critical safety or human review. No route writes course completion, class code, assignment, grade or public gallery.
- Account ownership is **not** school/tenant separation. An authorised teacher/classroom feature needs new schema/permissions and a tested cross-school boundary; this slice has neither.
- Local-only feature flagging is **not** remote infrastructure access control. All private-stage ingress, region, cost, backup, privacy, asset policy and legal decisions remain owner gates.

[API/runbook](PROJECT_CORE_RUNBOOK.md) · [only authoritative status register](FEATURE_REGISTER.md) · [architecture](ARCHITECTURE.md) · [design system baseline](DESIGN_SYSTEM.md)
