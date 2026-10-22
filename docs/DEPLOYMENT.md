# Run, verify and hand off the adult pilot

**Status (22 October 2026):** The original `draft-1` PostgreSQL adult pilot, separately gated `draft-2-candidate` engine and no-child-data `003_guardian_groundwork.sql` hold have been exercised locally. Verified: 32 frontend tests, 16 server tests including separate local PostgreSQL integrations and blocked minor access, 5 PDF-candidate tests, 49 passing desktop/mobile browser journeys with one intentional desktop-only skip, full typecheck/lint/build and zero-vulnerability npm audit. **An existing domainless Railway app service auto-deployed `main`; no Railway PostgreSQL service or private adult-engine migration has been verified, and adult routes are not enabled there.** GitHub `main` now includes the draft-2 engine, simplified previews and disabled guardian-safety groundwork; verify the current remote SHA before deployment. A GitHub push is not a Railway migration or hosted release. All public, child, partner, school, billing, AI and community journeys are browser-only demonstrations. `/pilot` and `/pilot/engine` are invitation-only **adult/internal draft rehearsals**, not official credit or verified identity. For the **new migration, flags and operator commands** use the [draft-2 runbook](LEARNING_ENGINE_RUNBOOK.md); this page retains the original pilot details.

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

## Railway handoff — **existing domainless app; private database/engine pending**

The current decision is a **private, domainless Railway adult/internal engine**, not a public demo or a publicly accessible tester portal. Follow the [full step-by-step setup](RAILWAY_PRIVATE_ADULT_SETUP.md) for the isolated project, private PostgreSQL, Node 22, `npm run engine:migrate` (001 + 002 + 003 safeguarding hold), explicit acknowledgements, exact origin, healthcheck, SSH-only smoke test, backups and rollback. This page retains the original draft-1 pilot history; do **not** use its previous public-origin plan as authority to generate a Railway domain. The [guardian-consent design](GUARDIAN_CONSENT_AND_IDENTITY.md) keeps all minor accounts and child-data collection blocked.

[Railway's PostgreSQL guide](https://docs.railway.com/databases/postgresql) says the database starts private; never enable public TCP access for operator convenience. Its [pre-deploy guide](https://docs.railway.com/deployments/pre-deploy-command) says migrations run on the private network in a separate container and stop deployment on failure. [Railway IaC guidance](https://docs.railway.com/infrastructure-as-code) deprecates `railway.json`: **new services ignore it**, legacy services read it and override dashboard settings until 1 December 2026. This source's legacy pre-deploy entry is updated to `engine:migrate`; set and verify commands explicitly on a new service. Railway healthchecks test deploy readiness, **not** continuous monitoring.

The app service exists and tracks GitHub `main`, but its PostgreSQL service, private migration, adult-engine flags, domain and online tester access are still absent. Turning adult feature flags off closes routes but **does not delete records**. Do not use the disposable local test databases for Railway or run any E2E/test reset against hosted data.

## GitHub `main` publication and verification

The user's [existing repository](https://github.com/Dennis-deve/desloop-academy) originally held five brand JPEGs on `main` at `880f334`. The previous approved push brought the branded draft-1 pilot to `c71307628dd3e1fca2f3cd057be6c6671c62879c`; its original root JPEGs are preserved, with copies in `assets/brand-originals/`. A subsequent verified fast-forward push brought the draft-2 engine, simpler UX and blocked guardian groundwork to `main` at `344d5964a74cc0c83d69b247cb28097b3eb336fe`. The development source directory is not a Git checkout; `/home/user/desloop-academy-publish/` is the clean `main` checkout. Confirm current remote state from GitHub rather than relying on this dated SHA.

The owner requested that all reviewed code changes go to **`main`**, not an unrequested demonstration branch. From the clean checkout, verify the exact diff and absence of credentials, run checks, fetch the current remote `main`, ensure only a **fast-forward** is needed, then use authenticated `git push origin main` and compare `git ls-remote origin refs/heads/main` with `git rev-parse HEAD`. **Never force-push, rewrite history, remove original brand JPEGs or assume a local commit is online.** If remote `main` changed, reconcile in a reviewable way before pushing. Keep Railway disconnected until the remote SHA is verified. A temporary GitHub authorisation should be revoked after confirmation; do not print or persist a token.

## Beyond the pilot — release blockers

- [ ] Expert/child-safety/accessibility review and publication of all 44 courses, question banks, rubrics and accommodations; version migration and independent assessment integrity.
- [ ] Verified age/guardian consent, school isolation, child safety operations, recovery/MFA, data rights, moderation, private evidence uploads and safe messaging before **any** minor or institution enrolment.
- [ ] Approved contacts, terms, prices, commissions, attribution, payment-provider checkout, signed webhooks, financial ledger and refund/payout procedures before billing.
- [ ] Production observability, distributed abuse controls, backup/restore and rollback, incident response, penetration and load testing, and manual WCAG 2.2 AA evaluation.
