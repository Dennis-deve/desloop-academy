# Railway: private adult/internal engine setup

**Status, 22 October 2026:** GitHub `main` has the tested draft-2 engine and child-safety hold. The owner's existing Railway project **`glorious-inspiration`** has a running `desloop-academy` service tracking `main`; it has **no public domain and, at this stage, no PostgreSQL service**. The owner chose to reuse this project, keep it domainless and use Amsterdam for **synthetic adult-only testing**. The current app is not yet a database-backed engine; do not present it as one. No real personal records, child identities or consent evidence are authorised. See [guardian safety hold](GUARDIAN_CONSENT_AND_IDENTITY.md) and [engine runbook](LEARNING_ENGINE_RUNBOOK.md).

## 0. Confirm the scope and source

An owner with Railway account/workspace permissions signs in with `railway login --browserless`; inspect `railway whoami` and the intended project/environment before changing anything. Confirm spending limits, approved region/data residency, backups/restore and operator ownership before real user data. All activity here is for **fictional/synthetic adult records only**. The owner's original root brand JPEGs remain in GitHub. From a clean Node 22 checkout whose HEAD equals remote `main`, run:

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run test:server
npm run build:all && npm audit --audit-level=low
# Dedicated local PostgreSQL integrations/E2E use ONLY disposable local databases.
```

The repository includes a reviewed **`.railway/railway.ts` IaC file** and the `railway` TypeScript SDK. Railway's deprecated `railway.json` is ignored by this **new** service; it cannot configure its pre-deploy command. The existing service has no active legacy Config-as-Code owner. Use the CLI IaC **plan** before **apply**; do not infer configuration from `railway.json`. See [Railway IaC](https://docs.railway.com/infrastructure-as-code) and its [reference](https://docs.railway.com/infrastructure-as-code/reference).

## 1. First-stage private database migration (adult routes remain off)

1. Link the trusted CLI checkout to the owner's existing `glorious-inspiration` project and its intended Railway environment. Check that `railway status` shows the **existing `desloop-academy` app only**. Do **not** run `railway init`, generate an app domain or reuse the unrelated project in the same account.
2. Set `PILOT_OPERATOR` as a named authorised operator in the **Railway service variables**, not in the public repository. Set it with `--skip-deploys` so this step does not trigger a partial deployment. The IaC uses `preserve()` to keep its existing value.
3. The first-stage IaC declares one new Railway **Postgres** service in Amsterdam (`ams`) and configures the existing app in the same region. It references only the DB's private `DATABASE_URL`; **no** public domain/TCP proxy, `DATABASE_PUBLIC_URL`, `VITE_` secret or custom ingress is declared. It sets Node 22, build `npm run build:all`, pre-deploy `npm run engine:migrate`, start `npm start`, health `/api/health` and a migration timeout. `APP_ORIGIN=https://no-public-origin.invalid` is a deliberately unreachable closed placeholder. `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false` keep adult endpoints off while migrations are installed; every minor flag stays `false`.
4. Run `railway config plan` from the linked checkout (or `--file` with an approved absolute IaC path). **Expect only one private database to be added and existing app settings/variables to change, with zero resources destroyed and no domain created.** Inspect the plan before `railway config apply`. If there is a delete, unknown region, public networking change, secret exposure or unexpected service, stop. Applying infrastructure can incur Railway charges.
5. Watch the build, pre-deploy and health logs. `engine:migrate` must apply/verify **001 draft-1, 002 draft-2 and 003 hard-disabled guardian groundwork** using private PostgreSQL. Failures block deployment; do not bypass the migration. [Railway pre-deploy](https://docs.railway.com/deployments/pre-deploy-command) runs in a separate private-network container and filesystem changes do not persist. Verify PostgreSQL's actual service/volume region is Amsterdam and that no public database TCP proxy or app domain appeared. Set up backups and a restore test before storing any real records.

The stage-one health response is expected to say `demo-only` **inside the private container** because the adult pilot flags are still off. That is an intentional migration hold, not permission to publish the browser demo.

## 2. Enable the private adult engine only after stage one passes

Change **only** `PILOT_ENABLED` and `ENGINE_V2_ENABLED` to `true` in `.railway/railway.ts`, while keeping both draft acknowledgements `true`, the three minor flags `false`, the private DB reference, **no domains** and the closed origin. Test and push the code change to GitHub `main`, run a new `railway config plan`, review the two variable changes, then apply. A new deployment must pass `engine:migrate` again and `/api/health` must return `adult-internal-pilot` inside the container. Do not call an IaC file on GitHub an applied Railway configuration until `plan` and `apply` have both succeeded.

With owner-approved [Railway SSH](https://docs.railway.com/cli/ssh) access to the running **app** service, run a non-destructive localhost health probe; the CLI may ask the owner to register an SSH key:

```bash
railway ssh -- node -e 'fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then(r=>r.json()).then(x=>{if(!x.ok||x.mode!=="adult-internal-pilot")process.exit(1);console.log("private adult engine healthy")})'
railway ssh -- node server/dist/cli.js engine-submissions  # expected empty before adult enrolments
```

`engine-submissions` verifies the safeguarding hold and candidate release and writes an operator audit event. Never print DB URLs, invite codes or user records into shared transcripts. `railway run` executes **locally** and may not resolve Railway's private database host. Without a reviewed **private same-origin HTTPS ingress**, browser registration/login is intentionally unavailable and no adult invitation is useful. A generated Railway domain is public exposure, **not** private access. Later private browser ingress must have no bypass Railway domain, use an approved identity-aware access layer and exact `APP_ORIGIN`, then be retested for CSRF/secure cookies before issuing verified-adult invitations out of band. The original draft-1 remains separate; minors remain entirely disabled.

## 3. Stop, rollback and credential hygiene

If a public domain/TCP proxy unexpectedly appears, remove exposure immediately. On migration, origin, privacy or auth failure set `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false`, review a fresh plan and redeploy the same reviewed source. Turning flags off **does not delete the database**; never run disposable local test resets or `TRUNCATE` against Railway. Keep backups, restore/retention and incident procedures under an accountable owner. Sign out of Railway CLI at handoff and remove any local token/session files left in the workspace. Revoke temporary GitHub/Railway tokens after the verified work is complete.
