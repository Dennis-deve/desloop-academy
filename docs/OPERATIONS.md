# Operations, release and incident readiness

**Current boundary:** existing Railway `glorious-inspiration`/`production` contains synthetic-only private Amsterdam PostgreSQL and a domainless adult engine on the **older verified GitHub main**. The new FND-01 branch is local until independently authorised push and a new deployment `SUCCESS` check. No public, minor or real-user release is approved. See [previous deployment record](RAILWAY_DEPLOYMENT_STATUS.md) and [Railway setup/rollback](RAILWAY_PRIVATE_ADULT_SETUP.md).

## Operator controls that exist

- `.railway/railway.ts` describes app+private DB, Amsterdam, Node 22, pre-deploy `engine:migrate`, health `/api/health`, adult-only flags and closed `APP_ORIGIN`. Always run `railway config plan` and review additions/deletions before `apply`; do **not** add a public domain/TCP proxy as a shortcut.
- Pre-deploy aborts on migration failure; app startup verifies content versions and safeguarding hold. `/api/health` checks DB connectivity when adult engine enabled. Railway healthcheck readiness is **not** continuous monitoring.
- Restricted operator CLI can issue private adult invitations, assign reviewers, inspect pending submissions and disable adult accounts; actions are audited in the application DB. None of this provides recovery/MFA or tamper-proof external audit retention.
- Rollback adult exposure by switching `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false` via reviewed IaC plan/apply. This closes routes but **does not erase records**. Do not run local test reset, `TRUNCATE` or `DROP` against Railway.

## Before personal data or external adult access — still missing

| Gate | Action / evidence needed |
|---|---|
| Ownership and alerting | Named on-call/security/safeguarding owners, documented escalation, private metrics and alerts for health, failed auth, migrations, storage and cost. |
| Database backups | Check actual volume region, backups/retention/encryption/access; restore into isolated environment, verify catalog/constraints and log drill results; establish RPO/RTO. |
| Secrets/roles | Reviewer MFA, restricted DB role, rotation plan, access inventory; avoid CLI sessions left on shared machines. |
| Privacy/safety | Qualified Ghana-focused counsel, DPIA/retention/erasure and child release decision; no guardian evidence collection or minor account before approval. |
| Release | Clean `main`, CI/security checks and branch protection, build bundle gate, diff/migration review, staged private deploy, live health/denial smoke, rollback and 24h observation. This local branch **has not** passed hosted verification. |
| Incidents | Classify, isolate ingress, revoke sessions/keys, preserve safe logs, notify owners, investigate, restore and review within approved legal timeframes; never expose child data in shared logs. |

**Safe local run:** Node 22 `npm ci`; `python3 scripts/build_public_catalog.py --check`; `npm run typecheck && npm run lint && npm test && npm run test:server && npm run build:all`; `npm audit --audit-level=low`. For a read-only local browser use `npm run dev` plus a disabled local API (`PILOT_ENABLED=false npm run dev:api`); the public course pages require no DB, adult integration tests require **new disposable** PostgreSQL databases. No provider messages/payments are sent. Stop test processes after use.
