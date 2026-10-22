# Roles, permissions and trust matrix

**Only the adult pilot roles below are enforced on a live backend.** Historical `Role` values in browser-only modules are local preview types, not entitlements; the release router does not expose those workspaces. No minor, school, partner, guardian or payment role can be obtained through the adult invitation endpoint.

| Actor | Read-only public course guide | Private pilot self-records | Review assigned work | Issue invites/disable adults | Child access / consent | School / payment / AI admin |
|---|---|---|---|---|---|---|
| Anonymous visitor | Yes (draft metadata only) | No | No | No | No | No |
| Invited self-attested adult `learner` | Yes | Own active draft-1 record; separately enrolled draft-2 record and private project revisions | No | No | No | No |
| Invited adult `reviewer` | Yes | Own account/session and assigned review queue | Assigned submissions only; audited decisions | No | No | No |
| Trusted CLI operator | Not a browser role | Restricted server/DB shell actions | Assign specific reviewers, inspect pending work | One-time invites, disable accounts, migration | Cannot bypass hard-disabled gate | No public admin UI |
| Minor / guardian / teacher / school / partner / payment staff | Public guide only as visitor | No account in these roles | No | No | No | No |

**Enforcement:** Fastify validates requests and looks up a hashed session in PostgreSQL. Cookie role is never trusted from the browser. Authenticated mutations require exact Origin, CSRF header/cookie match and server-side permission; reviewer writes require assignment, attempts use idempotent IDs and transactions, and disabled sessions are rejected. `APP_ORIGIN` remains a closed placeholder on Railway, so the current private API is not browser-accessible to external testers. Public course search is static and grants nothing. Direct fake workspace URLs receive HTTP 404 on the built server and no privileged state.

**Missing boundaries:** secure account recovery/email ownership, age verification, reviewer MFA, per-device session UI, school tenant IDs/RLS, staff verification, guardian authority, granular admin roles, upload ACLs and real billing permissions. Future policies must follow deny-by-default, per-record ownership, cross-school isolation tests, audited escalation and qualified safeguarding approval. See [security risks](SECURITY_AND_PRIVACY.md) and [feature status](FEATURE_REGISTER.md).
