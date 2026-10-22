# Run, verify and hand off the adult pilot

**Status (22 October 2026):** The original `draft-1` PostgreSQL adult pilot and an **additive, separately gated `draft-2-candidate` engine** have been exercised locally. Verified: 30 frontend tests, 14 server/policy tests including separate local PostgreSQL integrations, 5 PDF-candidate tests, 48 passing desktop/mobile browser journeys with 2 intentionally desktop-only skips, full typecheck/lint/build and zero-vulnerability npm audit; the extended Course 08 guided visual browser journey also passed on both desktop and mobile. **No Railway service or production database was provisioned; no migration has run on Railway and no hosted deployment has occurred.** The previous GitHub push at `c71307628dd3e1fca2f3cd057be6c6671c62879c` predates the new engine, which is still local-only. All public, child, partner, school, billing, AI and community journeys are browser-only demonstrations. `/pilot` and `/pilot/engine` are invitation-only **adult/internal draft rehearsals**, not official credit or verified identity. For the **new migration, flags and operator commands** use the [draft-2 runbook](LEARNING_ENGINE_RUNBOOK.md); this page retains the original pilot details.

## Local development (Node 22)

`package.json` and `.node-version` target Node **22** (required by current transitive packages). Use PostgreSQL **17+** for the local pilot. Do not use the disposable test DB or test credentials for real users.

```bash
cd desloop-academy
node --version                 # Node 22.x
npm ci                         # pinned package-lock.json
npm run typecheck
npm run lint
npm run test                   # public/frontend demo policy tests
npm run build:all              # static Vite bundle + compiled server/dist
npm audit --audit-level=low
```

Create an **isolated** PostgreSQL database and set its private connection string only in a trusted server shell or your secret store. Do not put `DATABASE_URL` in a `VITE_` variable or commit `.env`. After `build:all`:

```bash
export DATABASE_URL='postgresql://local_user@127.0.0.1:5432/desloop_pilot_local'
npm run pilot:migrate
export PILOT_ENABLED=true
export PILOT_DRAFT_ACKNOWLEDGED=true
export APP_ORIGIN=http://127.0.0.1:5173
export NODE_ENV=development
npm start                      # Fastify 0.0.0.0:4000; serves built app at :4000
# In another terminal: npm run dev (Vite :5173 proxies /api → 127.0.0.1:4000)
# Open http://127.0.0.1:5173/pilot
```

If `PILOT_ENABLED=false` or the API is unavailable, `/pilot` shows an unavailable state and the ordinary sample demo remains usable. The API checks the exact `APP_ORIGIN`; use the same origin in the browser. For an HTTPS deployment it sets Secure `__Host-` cookies. **Do not collect real child data or present this draft as published education.**

### Restricted operator shell

Build server first and set `DATABASE_URL` plus `PILOT_OPERATOR` in the operator's private terminal/session. Only give invitation codes directly to invited adults via an approved out-of-band channel. The code is shown once on stdout, never stored as plaintext, and expires after 48 hours. Example commands (addresses are placeholders):

```bash
npm run pilot:admin -- invite adult@example.invalid learner
npm run pilot:admin -- invite reviewer@example.invalid reviewer
npm run pilot:admin -- submissions
npm run pilot:admin -- assign <real-submission-uuid> reviewer@example.invalid
npm run pilot:admin -- disable adult@example.invalid
```

Do **not** paste invitation codes, real connection strings, passwords, personal data or GitHub tokens into chat, tickets, commit messages or screenshots. A review is not self-assignable; the operator must verify the adult account and assignment out of band. See `npm run pilot:admin -- help` for command usage.

### Verification against disposable DBs only

```bash
export PILOT_TEST_DATABASE_URL='postgresql://local_user@127.0.0.1:5432/desloop_pilot_test'
export ENGINE_TEST_DATABASE_URL='postgresql://local_user@127.0.0.1:5432/desloop_engine_test'
npm run test:server
# Browser tests require a DIFFERENT disposable database, migrated and used by the running API:
export PILOT_E2E_DATABASE_URL='postgresql://local_user@127.0.0.1:5432/desloop_pilot_e2e'
# Point DATABASE_URL of your local API at that E2E DB, APP_ORIGIN=http://127.0.0.1:5173.
npx playwright install chromium
# Linux if dependencies are missing: npx playwright install-deps chromium
npm run test:e2e
```

**Warning:** opt-in tests **TRUNCATE** their pilot-schema users, invitations and audit data. Run them only against distinct, dedicated, disposable local databases. Never point any `PILOT_*_DATABASE_URL` or `ENGINE_*_DATABASE_URL` E2E/test setting at Railway or a shared environment. The normal `npm run test:e2e` skips the database-dependent browser flow when no E2E URL is provided. Automated axe checks are a regression aid, **not** WCAG certification.

## Railway handoff — plan, not an accomplished deployment

Railway documents creating a PostgreSQL service and referencing its `DATABASE_URL` from an app service, which avoids pasting database credentials; it is private by default [1](https://docs.railway.com/databases/postgresql). Railpack prioritises `RAILPACK_NODE_VERSION` and `engines.node` when choosing Node, so **verify that the Railway build and runtime both use Node 22** [2](https://railpack.com/languages/node). Pre-deploy commands run in a separate container on the private network before start [3](https://docs.railway.com/deployments/pre-deploy-command).

1. After owner-authorised GitHub publication or an owner-run Railway CLI deployment, create a **non-production/internal** Railway project/environment and add its PostgreSQL service. Keep the DB off Public Access/TCP Proxy. Select a region and data residency with the operator's privacy lead. Configure backups, restore tests and alerts before storing any real data [1](https://docs.railway.com/databases/postgresql).
2. Add a Node app service from the same project root. Set build `npm run build:all`, pre-deploy **`npm run pilot:migrate` for draft-1 only** or **`npm run engine:migrate` for opt-in draft-2**, start `npm start`, and healthcheck `/api/health`. `PORT` is supplied by the host; the server listens on `0.0.0.0`. **Railway's `railway.json` config-as-code is deprecated**: new services ignore it, while legacy services still use it to override dashboard values until 1 December 2026. Check the actual pre-deploy command and [Railway IaC migration guide](https://docs.railway.com/infrastructure-as-code) before enabling draft-2; see the [engine runbook](LEARNING_ENGINE_RUNBOOK.md).
3. Add an app-service **reference** to the PostgreSQL service's `DATABASE_URL`; also set `NODE_ENV=production`, `APP_ORIGIN=https://<exact-approved-app-domain>` **without a trailing slash**, and `RAILPACK_NODE_VERSION=22`. Start with `PILOT_ENABLED=false`. Give the app service only the one approved HTTPS domain, with access controls outside the app appropriate for an internal pilot. Never use a second static origin for `/pilot`: cookies and CSRF rely on same-origin `/api`. The public demo can be hosted separately only if `/pilot` clearly reports disconnected there.
4. Review the 44-course draft, safeguarding and data-retention limitations with the responsible team. Only for invited **adults/internal reviewers**, explicitly set `PILOT_DRAFT_ACKNOWLEDGED=true` and `PILOT_ENABLED=true`, then redeploy. The migration **must succeed** and `verifyRelease` must match the checked-in content hash and policy before routes become active. `/api/health` now checks PostgreSQL when the pilot is on. A Railway healthcheck tests readiness at deploy time, not continuous monitoring [5](https://docs.railway.com/deployments/healthchecks).
5. Use the operator commands in a restricted runtime with the service's secret variables to issue invitations/assignments. Smoke-test the approved origin, registration, lesson gate, quiz, safety failure, manual review/revision, unlock, logout, disabled account, and API 401/403/423 responses. Verify that debug/dev URLs or browser demo roles cannot change pilot records. Check logs for accidental private-data exposure; rotate credentials and revoke test accounts. Keep a rollback and recovery plan.

**Caution:** Railway may enable connection pooling; its documentation recommends an unpooled URL for schema migrations that require a dedicated session [6](https://docs.railway.com/databases/postgresql-pgbouncer). Review this before adding PgBouncer. There are now two repeatable additive pilot migrations (001 and 002), but still no general versioned publication/migration framework. The DB connection is set to private-network mode by default; if an external TLS connection is ever required, configure and validate CA trust with `DATABASE_TLS=verify` before use. Do not switch to a public database URL merely to make CLI commands convenient.

`PILOT_ENABLED=false` disables all registration, learner and review routes; the public static demo remains. Turning the pilot off does **not delete** already stored pilot records. Prepare lawful retention, request-handling and database deletion procedures before any real user data. For public launch, also require reviewer MFA, verification/recovery, distributed abuse controls, independent audit retention, security and accessibility reviews, backup/restore exercises, and an approved content/assessment bank. A change to draft JSON **without a new reviewed version and migration intentionally fails startup**.

## Existing GitHub repository handoff

The user's [existing repository](https://github.com/Dennis-deve/desloop-academy) originally had five brand JPEGs on `main` at `880f334`. The earlier approved browser/device-auth push brought the branded original pilot to `main` at `c71307628dd3e1fca2f3cd057be6c6671c62879c`; authorization was removed afterward. Its original root JPEGs were preserved and copied into `assets/brand-originals/`; optimized derivatives live in `public/brand/`. **The new draft-2 work has not been pushed.** This working source directory is **not** the repository checkout; check the remote branch for changes since that SHA. Never replace its history, remove the root JPEGs, or force-push.

To publish this **new** source only after review, use an authenticated local checkout and the freshly generated `desloop-academy-source.zip` in a **new review branch**. Check the archive's paths and preserve any remote-only files. Example commands (adjust paths and branch name; do not reapply an older ZIP over newer changes):

```bash
git clone https://github.com/Dennis-deve/desloop-academy.git desloop-repo
cd desloop-repo
git fetch origin && git checkout -b draft-2-internal-learning-engine origin/main
unzip -o /path/to/desloop-academy-source.zip -d .
npm ci && npm run typecheck && npm run lint && npm run test && npm run build:all
git status --short
git add . && git diff --cached --check && git diff --cached --stat
# Review the diff and scan for secrets before committing.
git commit -m "Add opt-in internal learning engine and visual studio"
git push -u origin draft-2-internal-learning-engine  # open a review PR
```

These are optional owner-run handoff commands, **not** a claim that the current ZIP has been uploaded, the review branch created, or Railway deployed. Authenticate only via your own trusted Git credential/browser/device flow; never send tokens or private keys in chat. Branch protection, reviewer approval, secret scanning, CI checks and an operator-approved Railway connection remain to be configured.

## Beyond the pilot — release blockers

- [ ] Expert/child-safety/accessibility review and publication of all 44 courses, question banks, rubrics and accommodations; version migration and independent assessment integrity.
- [ ] Verified age/guardian consent, school isolation, child safety operations, recovery/MFA, data rights, moderation, private evidence uploads and safe messaging before **any** minor or institution enrolment.
- [ ] Approved contacts, terms, prices, commissions, attribution, payment-provider checkout, signed webhooks, financial ledger and refund/payout procedures before billing.
- [ ] Production observability, distributed abuse controls, backup/restore and rollback, incident response, penetration and load testing, and manual WCAG 2.2 AA evaluation.
