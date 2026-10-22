# Architecture, trust boundaries and remaining work

**Status (22 October 2026):** A working **local, invite-only adult/internal pilot** for identity, the 44-course sequence and assigned human review has been built and tested against local PostgreSQL. It is **not deployed on Railway, published as official credit, or suitable for minors**. The much broader public/role app is still a labelled browser-only demonstration.

## Two intentionally separate systems

```text
PUBLIC DEMO: /, /courses, /demo, /app, /school, /partner, ...
  React routes → demo providers → localStorage / sessionStorage / IndexedDB
  Local role switch, practice and reviewer buttons only affect this browser.

ADULT PILOT: /pilot, /pilot/courses/:id, /pilot/reviews
  React pilot client → same-origin /api/pilot/* → Fastify (Node 22)
                                                → parameterized SQL → PostgreSQL pilot schema
  No browser role picker or client-computed result is authoritative.
```

The public 44-course map and the pilot share `src/curriculum/master.json` as a **draft**. The public map bundles example answer keys, so the pilot's checks are only a rehearsal: the API hides keys in its own course response and scores independently, but the answers are still obtainable from the public demo bundle. Separate, expert-reviewed and access-controlled question banks are required before credentialing. Do not pretend that hiding answers in the API prevents a determined tester from inspecting the demo.

### What the pilot implements

- **Account boundary:** `server/src/api.ts`, `security.ts`, `config.ts`. One-time, expiring hashed invitation codes for either `learner` or `reviewer`; self-attested adulthood; Argon2 password hashes; random opaque HttpOnly session cookies backed by hashed database tokens; revocation on logout or account disable; same-origin JSON mutations, exact `Origin` and synchronizer-style double-submit CSRF cookie/header with a server-side hash; no CORS grant. The adult assertion and possession of an invitation are **not age or email verification**. The pilot has no account recovery/MFA or child registration.
- **Data boundary:** `server/migrations/001_adult_pilot.sql` creates the isolated `pilot` schema for invited accounts, sessions, lesson and quiz attempts, project submissions, reviewer assignments, review decisions, versioned course completions and application-append-only audit events. SQL uses bound parameters. In practice the database owner can alter/drop audit tables: this is not independently tamper-proof logging. No tenant or school tables exist in the pilot.
- **Release boundary:** `server/src/catalog.ts` validates exactly 44 ordered course IDs and four lessons per course. The database records `draft-1`, a SHA-256 hash of the content bytes, and policy `internal-pilot-1`. Startup and operator commands fail closed if that registered version/hash/policy changes. A revised curriculum needs a **new version and migration**, an expert review, and an explicit decision about existing attempts; do not replace the JSON in place.
- **Progression boundary:** `server/src/progression.ts` locks the learner row during transactions, computes a contiguous prefix of current-version course completions, and allows only the first incomplete course. Four lesson practice descriptions and correct checks in order, a server-scored five-item quiz (≥80% and every critical safety answer), a safe project description and an **explicitly assigned** reviewer are required. Project and overall scores ≥70%, safety ≥70% and safety approval are needed for server-written completion/unlock. Weak decisions request revision in the current course. URL manipulation, local flags and role switching cannot bypass it. Per-learner attempt request UUIDs prevent duplicate recording and reject reuse for a different activity.
- **Operator boundary:** `server/src/cli.ts` handles migration, invitation issuance, assignment, unreviewed-submission listing and disabling accounts from a restricted shell. There is no browser admin role for the pilot. Audit events record these actions. Keep CLI access and invitation distribution private.
- **UI boundary:** `src/features/pilot/` renders actual API results and scoped forms; the server validates everything again. `PublicLayout` changes the banner on pilot routes. `/demo` links to `/pilot` with a clear distinction. Same-origin requests, HttpOnly cookie, CSRF token and no `VITE_` secrets. Loading, unavailable, locked, retry, waiting and reviewer-empty states are present.

## Controls not yet sufficient for real deployment to external learners

| Area | Pilot scope and missing gate |
| --- | --- |
| Children and schools | **No minors**. No verified age/guardian consent, family linking, school isolation, staff background checks, child incident handling or permitted messaging. Implement tenant-scoped RBAC and safeguarding with trained owners before expanding. |
| Content and awards | All 44 courses/176 lesson outlines and checks are unreviewed. The public demo exposes draft answer keys. No published/immutable credential version, accessibility sign-off, accommodation policy, credible assessment integrity or official transcript. |
| Identity operations | No verified email, recovery, reviewer MFA, enterprise SSO or account/device management. IP rate limits are process-local, not a distributed abuse-control system. |
| Storage and privacy | Text-only private evidence, no upload pipeline, malware scans, object access policy, encryption-key plan, retention automation, consent record, export or self-service deletion. Define lawful basis, retention and operator procedures before collecting real personal data. |
| Payments, commissions and AI | All other workflows are demo-only. No checkout, entitlements, financial ledger, payees, AI provider, moderation pipeline or delivered communications. Never grant benefits from local browser calculations. |
| Reliability | Local PostgreSQL tests and browser E2E pass, but Railway integration, backups and restore drill, distributed throttling, monitoring, incident response, load/security testing and disaster recovery are not done. |

For production, establish separately reviewed `published` content versions, account and consent systems, per-school data boundaries, audited assignments and appeals, authoritative billing/attribution, safe file storage, and retention/deletion workflows. This adult draft pilot should **not** be connected to the public demo account provider or repurposed for children merely by changing an age-band selector. See [deployment handoff](DEPLOYMENT.md) and [curriculum review](CURRICULUM.md).
