# Data model and migration plan

**Current durable database:** private PostgreSQL 17-compatible migrations in `server/migrations/`; Railway's synthetic-only database was verified on older source, while deployment of FND-01 after its GitHub push is **unverified**. FND-01 public catalogue is a versioned **static projection**, not a table of visitor records and not a progress store.

| Schema / migration | Primary entities | Ownership, integrity and review |
|---|---|---|
| `pilot.*` / `001_adult_pilot.sql` | Adult invitations (one-time hashed token/expiry/role), users (Argon2 password hash, self-attested adult status), sessions (hashed token/CSRF, expiry/revoke), lesson/quiz attempts, project submissions, assigned reviews, course completions, audit events. | Adult users only; account/role comes from operator invitation, not browser. Unique IDs/constraints, per-user queries, transactional progression, append-only application audit. No school tenant or verified identity. |
| `learning.*` / `002_learning_engine.sql` | Unpublished content/policy release, catalog courses/modules/lessons/hints, enrolments, seven module/course states, attempts, immutable project revisions, visual workspace revisions, assigned reviews, completion/audit records. | Separate `draft-2-candidate`; catalog hash/policy pin; one-course-at-a-time row locks; guided rubric vs private ungraded playground; no automatic draft-1 credit conversion. |
| `safeguarding.*` / `003_guardian_groundwork.sql` | Single versioned `release_gate`, eight `not_ready` required controls. | Database CHECK constraints prohibit enabling minor accounts, child-data collection or minor learning; **no child identity/guardian evidence table or collection endpoint**. Later child release requires a new migration and approved process. |

**Public content projection:** `scripts/build_public_catalog.py` allowlists `version`, nine stages and 44 ordered course IDs/titles/purposes/stage/hours/age-adaptation text/four **module titles only**. Outcomes and module focus were withheld after an automated build gate found they duplicated correct draft quiz options. No check, option, answer index, explanation, lesson body or user data belongs in public JSON. `python3 scripts/build_public_catalog.py --check` and `npm run verify:release` detect stale/unsafe data and unwanted JS chunks. The source master remains a **draft**, not a published question bank.

## Future migration order (not yet implemented)

1. Approved verified adult identity/recovery, reviewer MFA, scoped sessions and retention/erasure before external adult enrolment.
2. Organisation/tenant and school/staff membership with all queries tenant-scoped, DB constraints/RLS where appropriate and cross-tenant tests **before** school imports.
3. Qualified-approved age/guardian authority/consent/version/withdrawal state machine and operational safety review **before** creating minor records; never repurpose the disabled 003 hold as consent proof.
4. Reviewed, access-controlled assessment bank/published course releases and durable credentials separate from draft answers; explicit migration policy for in-progress versions.
5. Real AI/provider usage records, private uploads/object ACLs, payment ledger/idempotency, referral attribution and message/notification events only after approved service contracts and privacy controls.
6. Conflict-aware offline operation IDs/reconciliation and capped local store, with server verification before progression; then privacy-safe aggregates.

Every migration needs an additive/rollback review, data ownership, idempotency, backup/restore test and a restriction against running disposable test `TRUNCATE` on Railway. See [architecture](ARCHITECTURE.md), [permissions](ROLES_AND_PERMISSIONS.md) and [operations](OPERATIONS.md). Database-owner audit mutation remains possible; independent log retention and restricted DB roles are not implemented.
